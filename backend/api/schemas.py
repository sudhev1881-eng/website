from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Status = Literal["EMPTY", "OCCUPIED", "MOTION_DETECTED", "SIGNAL_UNSTABLE"]
TrainingLabel = Literal[
    "EMPTY",
    "OCCUPIED",
    "PERSON_ENTERS",
    "PERSON_STANDING",
    "PERSON_SITTING",
    "PERSON_MOVING",
    "PERSON_LEAVES",
    "MOTION",
]


class PredictionResponse(BaseModel):
    status: str
    confidence: float
    motion: bool
    signal_quality: str
    timestamp: str
    last_change: str


class SimulatorStateRequest(BaseModel):
    state: Literal["EMPTY", "OCCUPIED", "MOTION", "UNSTABLE"]


class TrainingSessionRequest(BaseModel):
    name: str = "Manual training session"
    notes: str | None = None


class TrainingCollectRequest(BaseModel):
    label: TrainingLabel
    sample_count: int = Field(default=80, ge=5, le=1000)


class CalibrationStepRequest(BaseModel):
    step: Literal[
        "connect_device",
        "select_room",
        "collect_empty_baseline",
        "collect_occupied_baseline",
        "train_model",
        "complete",
    ]
    room_id: str | None = None


class DeviceConnectRequest(BaseModel):
    mode: Literal["simulated", "jsonl"] = "simulated"
    source_path: str | None = None
