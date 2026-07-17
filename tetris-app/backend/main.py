import asyncio
import json
import os
import re
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from controller.game_controller import GameController
from solver.placement_solver import get_top_placements, board_to_text

load_dotenv()
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """あなたはテトリスの上級プレイヤーです。
サーバーが計算した置き場所の候補（上位5件）が与えられます。
各候補には rot（回転）, col（列）, use_hold（ホールドを使うか）, score, lines_cleared, holes, bumpiness, aggregate_height, board_after が含まれます。
use_hold=True の場合はホールドキー（K）を押してからホールドのミノをその位置に置きます。

最もスコアが高く、次のミノとの相性も考慮した最善の一手を選んでください。

以下の形式で日本語で答えてください：

選択: rot=X, col=Y, use_hold=False

理由: （2〜3文。なぜその位置が良いかだけを書く。穴・凹凸・ライン消去・次のミノとの相性などを具体的に。use_hold=True なら冒頭に「ホールドして」と書く。他の位置との比較はしない。）"""


def build_prompt(data: dict, placements: list) -> str:
    next_text = " → ".join(data.get("next_pieces", [])) or "なし"
    hold_text = data.get("hold_piece_shape") or "なし"

    candidates = []
    for i, p in enumerate(placements, 1):
        hold_label = "（ホールド）" if p["use_hold"] else ""
        candidates.append(
            f"候補{i}{hold_label}: rot={p['rot']}, col={p['col']}, use_hold={p['use_hold']}, "
            f"score={p['score']}, lines={p['lines_cleared']}, "
            f"holes={p['holes']}, bumpiness={p['bumpiness']}, "
            f"height={p['aggregate_height']}\n{p['board_after']}"
        )

    current_board_text = board_to_text(data["board"])
    return (
        f"現在の盤面:\n{current_board_text}\n\n"
        f"現在のミノ: {data['current_piece_shape']}\n"
        f"ネクスト: {next_text}\n"
        f"ホールド: {hold_text}\n\n"
        f"=== 置き場所の候補（スコア順）===\n\n"
        + "\n\n".join(candidates)
    )

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAVITY_INTERVAL = 10.0      # 重力による自動落下間隔（秒）
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


def _parse_selected_index(reply: str, placements: list) -> int:
    # rot=X, col=Y, use_hold=True/False を優先パース
    m = re.search(r'rot\s*=\s*(\d+).*?col\s*=\s*(\d+).*?use_hold\s*=\s*(True|False)', reply)
    if m:
        rot, col, use_hold = int(m.group(1)), int(m.group(2)), m.group(3) == "True"
        for i, p in enumerate(placements):
            if p["rot"] == rot and p["col"] == col and p["use_hold"] == use_hold:
                return i
    # フォールバック: rot+col だけで照合
    m = re.search(r'rot\s*=\s*(\d+).*?col\s*=\s*(\d+)', reply)
    if m:
        rot, col = int(m.group(1)), int(m.group(2))
        for i, p in enumerate(placements):
            if p["rot"] == rot and p["col"] == col:
                return i
    return 0


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    placements = get_top_placements(
        body["board"],
        body["current_piece_shape"],
        hold_shape=body.get("hold_piece_shape"),
    )
    prompt = build_prompt(body, placements)

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        reply = response.choices[0].message.content
        idx = _parse_selected_index(reply, placements)
        selected = placements[idx] if placements else None
        return {
            "reply": reply,
            "selected_cells": selected["cells"] if selected else [],
            "use_hold": selected["use_hold"] if selected else False,
        }
    except Exception as e:
        return {"reply": f"エラー: {e}", "selected_cells": [], "use_hold": False}


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

            if action == "restart":
                controller.restart()
                cancel_lock()

            elif not controller.state.game_over and action in _ACTIONS:
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
