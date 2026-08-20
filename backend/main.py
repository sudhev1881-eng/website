from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from starlette.websockets import WebSocket

from api.routes import router
from csi.hardware import JsonLineCSICollector
from csi.interface import CSICollector
from csi.simulator import SimulatedCSICollector
from database.db import SensorDatabase
from ml.model import PresenceModel
from ml.prediction import PredictionSmoother
from signal_processing.features import extract_features
from signal_processing.preprocessing import preprocess_measurement, signal_quality

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("wifi-csi")


class Settings(BaseSettings):
    host: str = os.getenv("CSI_API_HOST", "0.0.0.0")
    port: int = int(os.getenv("CSI_API_PORT", "8000"))
    device_mode: str = os.getenv("CSI_DEVICE_MODE", "simulated")
    room_id: str = os.getenv("CSI_ROOM_ID", "lab-1")
    database_path: str = os.getenv("CSI_DATABASE_PATH", "backend/database/wifi_sensing.db")
    model_path: str = os.getenv("CSI_MODEL_PATH", "backend/models/presence_model.joblib")
    sample_rate_hz: float = float(os.getenv("CSI_SAMPLE_RATE_HZ", "8"))
    history_limit: int = int(os.getenv("CSI_HISTORY_LIMIT", "500"))
    allowed_origins: str = os.getenv("CSI_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    jsonl_source_path: str | None = os.getenv("CSI_JSONL_SOURCE_PATH")


@dataclass
class AppState:
    settings: Settings
    database: SensorDatabase
    model: PresenceModel
    collector: CSICollector
    smoother: PredictionSmoother = field(default_factory=PredictionSmoother)
    current_prediction: dict[str, Any] = field(default_factory=lambda: {
        "status": "SIGNAL_UNSTABLE",
        "confidence": 0.0,
        "motion": False,
        "signal_quality": "UNSTABLE",
        "timestamp": "",
        "last_change": "",
    })
    websockets: set[WebSocket] = field(default_factory=set)
    task: asyncio.Task | None = None

    async def broadcast(self, payload: dict[str, Any]) -> None:
        disconnected: list[WebSocket] = []
        for websocket in list(self.websockets):
            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected.append(websocket)
        for websocket in disconnected:
            self.websockets.discard(websocket)


def create_collector(settings: Settings) -> CSICollector:
    if settings.device_mode == "jsonl":
        if not settings.jsonl_source_path:
            raise RuntimeError("CSI_JSONL_SOURCE_PATH is required when CSI_DEVICE_MODE=jsonl")
        return JsonLineCSICollector(settings.jsonl_source_path, room_id=settings.room_id)
    return SimulatedCSICollector(room_id=settings.room_id, sample_rate_hz=settings.sample_rate_hz)


def detect_motion(features: dict[str, float], previous: dict[str, Any] | None) -> bool:
    if features["amp_diff_std"] > 2.2 or features["phase_diff_std"] > 0.24:
        return True
    if previous and previous.get("status") == "OCCUPIED" and features["amp_range"] > 14:
        return True
    return False


async def seed_synthetic_training_data(app_state: AppState) -> None:
    if app_state.model.trained or app_state.database.label_counts(app_state.settings.room_id):
        return
    if not isinstance(app_state.collector, SimulatedCSICollector):
        logger.info("No trained model found; waiting for real labeled CSI samples")
        return
    logger.info("Seeding synthetic CSI training data for simulator")
    original_state = app_state.collector.state
    from ml.training import collect_labeled_samples, train_from_database

    app_state.collector.set_state("EMPTY")
    await collect_labeled_samples(app_state.collector, app_state.database, "EMPTY", 100)
    app_state.collector.set_state("OCCUPIED")
    await collect_labeled_samples(app_state.collector, app_state.database, "OCCUPIED", 100)
    app_state.collector.set_state("MOTION")
    await collect_labeled_samples(app_state.collector, app_state.database, "PERSON_MOVING", 60)
    await train_from_database(app_state.database, app_state.model, app_state.settings.room_id)
    app_state.collector.set_state(original_state)


async def prediction_loop(app_state: AppState) -> None:
    await app_state.collector.connect()
    await seed_synthetic_training_data(app_state)
    while True:
        try:
            measurement = await app_state.collector.read()
            processed = preprocess_measurement(measurement)
            features = extract_features(processed)
            quality = signal_quality(processed)
            raw = {"status": "SIGNAL_UNSTABLE", "confidence": 0.0}
            if app_state.model.trained and quality != "UNSTABLE":
                raw = app_state.model.predict(features)
            motion = detect_motion(features, app_state.current_prediction)
            smoothed = app_state.smoother.smooth(str(raw["status"]), float(raw["confidence"]), motion, quality)
            if motion and smoothed["status"] == "OCCUPIED":
                display_status = "MOTION_DETECTED"
            elif smoothed["status"] == "OCCUPIED":
                display_status = "OCCUPIED"
            elif smoothed["status"] == "EMPTY":
                display_status = "EMPTY"
            else:
                display_status = "SIGNAL_UNSTABLE"
            app_state.current_prediction = {**smoothed, "status": display_status}
            app_state.database.insert_prediction(
                measurement.room_id,
                app_state.current_prediction["status"],
                app_state.current_prediction["confidence"],
                app_state.current_prediction["motion"],
                quality,
                features,
            )
            await app_state.broadcast(app_state.current_prediction)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Prediction loop failed: %s", exc)
            await asyncio.sleep(1)


def build_app() -> FastAPI:
    settings = Settings()
    root = Path(__file__).resolve().parent.parent
    database_path = settings.database_path
    model_path = settings.model_path
    if not Path(database_path).is_absolute():
        database_path = str(root / database_path)
    if not Path(model_path).is_absolute():
        model_path = str(root / model_path)
    sensor_state = AppState(
        settings=settings,
        database=SensorDatabase(database_path),
        model=PresenceModel(model_path),
        collector=create_collector(settings),
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.sensor_state = sensor_state
        sensor_state.task = asyncio.create_task(prediction_loop(sensor_state))
        logger.info("Wi-Fi CSI service started", extra={"room_id": settings.room_id, "mode": settings.device_mode})
        try:
            yield
        finally:
            if sensor_state.task:
                sensor_state.task.cancel()
            await sensor_state.collector.disconnect()

    app = FastAPI(
        title="Wi-Fi CSI Presence Detection API",
        description="Privacy-preserving room occupancy sensing from CSI, with simulated CSI mode for development.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.sensor_state = sensor_state
    origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    return app


app = build_app()


if __name__ == "__main__":
    import uvicorn

    settings = Settings()
    reload_enabled = os.getenv("CSI_RELOAD", "false").lower() == "true"
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=reload_enabled)
