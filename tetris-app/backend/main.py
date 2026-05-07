import asyncio
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from controller.game_controller import GameController

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAVITY_INTERVAL = 1.0  # seconds per auto-fall tick

_ACTIONS = {
    "move_left",
    "move_right",
    "move_down",
    "hard_drop",
    "rotate_clockwise",
    "rotate_counterclockwise",
    "hold",
}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    controller = GameController()

    async def gravity_loop():
        while True:
            await asyncio.sleep(GRAVITY_INTERVAL)
            if not controller.state.game_over:
                controller.gravity_tick()
                try:
                    await websocket.send_text(json.dumps(controller.get_state()))
                except Exception:
                    return

    gravity_task = asyncio.create_task(gravity_loop())

    try:
        await websocket.send_text(json.dumps(controller.get_state()))

        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")

            if not controller.state.game_over and action in _ACTIONS:
                getattr(controller, action)()

            await websocket.send_text(json.dumps(controller.get_state()))

    except WebSocketDisconnect:
        pass
    finally:
        gravity_task.cancel()
