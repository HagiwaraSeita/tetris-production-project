import asyncio
import json
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from controller.game_controller import GameController

load_dotenv()
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAVITY_INTERVAL = 1.0      # 重力による自動落下間隔（秒）
LOCK_DELAY = 30 / 60        # 設置判定までの猶予（30フレーム = 0.5秒 @60fps）

_ACTIONS = {
    "move_left",
    "move_right",
    "move_down",
    "hard_drop",
    "rotate_clockwise",
    "rotate_counterclockwise",
    "rotate_180",
    "hold",
}

# 接地中に成功したとき設置タイマーをリセットするアクション（横移動・回転）
_LOCK_RESET_ACTIONS = {
    "move_left",
    "move_right",
    "rotate_clockwise",
    "rotate_counterclockwise",
    "rotate_180",
}


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    message = body.get("message", "こんにちは")

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": message}],
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"エラー: {e}"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    controller = GameController()
    lock_task: Optional[asyncio.Task] = None

    async def send_state():
        await websocket.send_text(json.dumps(controller.get_state()))

    def cancel_lock():
        nonlocal lock_task
        if lock_task and not lock_task.done():
            lock_task.cancel()
        lock_task = None

    def start_lock():
        nonlocal lock_task
        cancel_lock()
        lock_task = asyncio.create_task(_lock_after_delay())

    async def _lock_after_delay():
        nonlocal lock_task
        await asyncio.sleep(LOCK_DELAY)
        lock_task = None
        if not controller.state.game_over and controller.is_grounded():
            controller.force_lock()
            try:
                await send_state()
            except Exception:
                pass

    async def gravity_loop():
        while True:
            await asyncio.sleep(GRAVITY_INTERVAL)
            if controller.state.game_over:
                continue

            was_grounded = controller.is_grounded()
            moved = controller.gravity_tick()

            # 着地した瞬間（空中→接地）にロックタイマー開始
            if not was_grounded and controller.is_grounded():
                start_lock()

            if moved or (not was_grounded and controller.is_grounded()):
                try:
                    await send_state()
                except Exception:
                    return

    gravity_task = asyncio.create_task(gravity_loop())

    try:
        await send_state()

        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")

            if not controller.state.game_over and action in _ACTIONS:
                was_grounded = controller.is_grounded()

                if action in ("hard_drop", "hold"):
                    # 即時ロック or ピース交換 → タイマー不要
                    cancel_lock()
                    getattr(controller, action)()
                else:
                    changed = getattr(controller, action)()

                    if changed:
                        if action in _LOCK_RESET_ACTIONS and controller.is_grounded():
                            # 接地したまま横移動 or 回転成功 → タイマーリセット
                            start_lock()
                        elif action in _LOCK_RESET_ACTIONS and not controller.is_grounded():
                            # 回転でピースが浮いた → タイマーキャンセル
                            cancel_lock()
                        elif not was_grounded and controller.is_grounded():
                            # ソフトドロップで着地 → タイマー開始
                            start_lock()

            await send_state()

    except WebSocketDisconnect:
        pass
    finally:
        gravity_task.cancel()
        cancel_lock()
