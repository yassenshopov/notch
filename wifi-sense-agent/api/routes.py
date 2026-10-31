from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from agent.engine import LiveFrame, SensorEngine
from api.models import CalibrationStepBody, HealthResponse, StatusResponse
from diagnostics.hardware import read_hardware_snapshot

security = HTTPBearer(auto_error=False)


def create_router(engine: SensorEngine, auth_token: str | None) -> APIRouter:
    router = APIRouter()

    def verify_auth(creds: HTTPAuthorizationCredentials | None = Depends(security)) -> None:
        if not auth_token:
            return
        if creds is None or creds.credentials != auth_token:
            raise HTTPException(status_code=401, detail="unauthorized")

    @router.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(ok=True)

    @router.get("/api/status", response_model=StatusResponse, dependencies=[Depends(verify_auth)])
    def status() -> StatusResponse:
        hw = read_hardware_snapshot(engine.config.iface)
        data = engine.status_dict(hw)
        return StatusResponse(**data)

    @router.get("/api/history/signal", dependencies=[Depends(verify_auth)])
    def history_signal(since: float | None = None, limit: int = 500):
        import time

        since_ts = since if since is not None else time.time() - 3600
        return {"points": engine.store.history_signal(since_ts, limit=limit)}

    @router.get("/api/history/motion", dependencies=[Depends(verify_auth)])
    def history_motion(since: float | None = None, limit: int = 200):
        import time

        since_ts = since if since is not None else time.time() - 86400
        return {"events": engine.store.history_motion(since_ts, limit=limit)}

    @router.post("/api/calibration/start", dependencies=[Depends(verify_auth)])
    def calibration_start():
        engine.start_calibration()
        return {"ok": True, "step": "empty"}

    @router.post("/api/calibration/step", dependencies=[Depends(verify_auth)])
    def calibration_step(body: CalibrationStepBody):
        try:
            engine.advance_calibration(body.step)
        except ValueError as err:
            raise HTTPException(status_code=400, detail=str(err)) from err
        return {"ok": True, "step": body.step}

    @router.post("/api/calibration/finish", dependencies=[Depends(verify_auth)])
    def calibration_finish():
        try:
            profile = engine.finish_calibration()
        except ValueError as err:
            raise HTTPException(status_code=400, detail=str(err)) from err
        return {"ok": True, "calibration": profile}

    @router.post("/api/recording/start", dependencies=[Depends(verify_auth)])
    def recording_start(label: str = ""):
        engine.start_recording(label)
        return {"ok": True, "recording": True}

    @router.post("/api/recording/stop", dependencies=[Depends(verify_auth)])
    def recording_stop():
        path = engine.stop_recording()
        return {"ok": True, "path": path}

    @router.websocket("/ws/live")
    async def ws_live(websocket: WebSocket):
        if auth_token:
            header = websocket.headers.get("authorization") or ""
            token = header.removeprefix("Bearer ").strip()
            if not token:
                token = websocket.query_params.get("token") or ""
            if token != auth_token:
                await websocket.close(code=4401)
                return
        await websocket.accept()
        queue = engine.subscribe()
        try:
            while True:
                frame: LiveFrame = await queue.get()
                await websocket.send_json({"type": frame.type, **frame.payload})
        except WebSocketDisconnect:
            pass
        finally:
            engine.unsubscribe(queue)

    return router
