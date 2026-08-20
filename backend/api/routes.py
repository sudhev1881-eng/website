from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from api.schemas import (
    CalibrationStepRequest,
    DeviceConnectRequest,
    SimulatorStateRequest,
    TrainingCollectRequest,
    TrainingSessionRequest,
)
from csi.hardware import JsonLineCSICollector
from csi.simulator import SimulatedCSICollector
from ml.training import collect_labeled_samples, train_from_database

if TYPE_CHECKING:
    from main import AppState

router = APIRouter()


def state(request: Request) -> "AppState":
    return request.app.state.sensor_state


@router.get("/health")
async def health(request: Request):
    app_state = state(request)
    return {
        "status": "ok",
        "service": "wifi-csi-presence",
        "mode": app_state.settings.device_mode,
        "model_trained": app_state.model.trained,
    }


@router.get("/api/status")
async def get_status(request: Request):
    return state(request).current_prediction


@router.get("/api/history")
async def get_history(request: Request, limit: int = 100):
    app_state = state(request)
    return {"items": app_state.database.latest_predictions(app_state.settings.room_id, min(limit, 500))}


@router.get("/api/timeline")
async def get_timeline(request: Request, limit: int = 300):
    app_state = state(request)
    return {"items": app_state.database.prediction_timeline(app_state.settings.room_id, min(limit, 1000))}


@router.get("/api/device/status")
async def device_status(request: Request):
    return state(request).collector.status()


@router.post("/api/device/connect")
async def connect_device(payload: DeviceConnectRequest, request: Request):
    app_state = state(request)
    await app_state.collector.disconnect()
    if payload.mode == "simulated":
        app_state.collector = SimulatedCSICollector(
            room_id=app_state.settings.room_id,
            sample_rate_hz=app_state.settings.sample_rate_hz,
        )
    else:
        if not payload.source_path:
            raise HTTPException(status_code=400, detail="source_path is required for jsonl mode")
        app_state.collector = JsonLineCSICollector(payload.source_path, room_id=app_state.settings.room_id)
    await app_state.collector.connect()
    return app_state.collector.status()


@router.post("/api/simulator/state")
async def set_simulator_state(payload: SimulatorStateRequest, request: Request):
    app_state = state(request)
    if not isinstance(app_state.collector, SimulatedCSICollector):
        raise HTTPException(status_code=409, detail="Current collector is not the simulator")
    app_state.collector.set_state(payload.state)
    return app_state.collector.status()


@router.post("/api/training/session")
async def create_training_session(payload: TrainingSessionRequest, request: Request):
    app_state = state(request)
    session_id = app_state.database.create_training_session(app_state.settings.room_id, payload.name, payload.notes)
    return {"session_id": session_id, "room_id": app_state.settings.room_id}


@router.post("/api/training/collect")
async def training_collect(payload: TrainingCollectRequest, request: Request):
    app_state = state(request)
    if isinstance(app_state.collector, SimulatedCSICollector):
        if payload.label in {"EMPTY", "PERSON_LEAVES"}:
            app_state.collector.set_state("EMPTY")
        elif payload.label in {"PERSON_MOVING", "MOTION"}:
            app_state.collector.set_state("MOTION")
        else:
            app_state.collector.set_state("OCCUPIED")
    return await collect_labeled_samples(app_state.collector, app_state.database, payload.label, payload.sample_count)


@router.post("/api/training/train")
async def train_model(request: Request):
    app_state = state(request)
    try:
        metrics = await train_from_database(app_state.database, app_state.model, app_state.settings.room_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return metrics


@router.get("/api/training/labels")
async def training_labels(request: Request):
    app_state = state(request)
    return {"room_id": app_state.settings.room_id, "label_counts": app_state.database.label_counts(app_state.settings.room_id)}


@router.post("/api/calibration/step")
async def calibration_step(payload: CalibrationStepRequest, request: Request):
    app_state = state(request)
    metrics = {"device": app_state.collector.status(), "model_trained": app_state.model.trained}
    app_state.database.record_calibration_step(app_state.settings.room_id, payload.step, "completed", metrics)
    if payload.step == "collect_empty_baseline":
        result = await collect_labeled_samples(app_state.collector, app_state.database, "EMPTY", 80)
        metrics.update(result)
    elif payload.step == "collect_occupied_baseline":
        result = await collect_labeled_samples(app_state.collector, app_state.database, "OCCUPIED", 80)
        metrics.update(result)
    elif payload.step == "train_model":
        metrics.update(await train_from_database(app_state.database, app_state.model, app_state.settings.room_id))
    return {"step": payload.step, "status": "completed", "metrics": metrics}


@router.websocket("/ws/status")
async def status_websocket(websocket: WebSocket):
    await websocket.accept()
    app_state = websocket.app.state.sensor_state
    app_state.websockets.add(websocket)
    try:
        await websocket.send_json(app_state.current_prediction)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        app_state.websockets.discard(websocket)
