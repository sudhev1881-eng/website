from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(slots=True)
class CSIMeasurement:
    """One CSI snapshot from a replaceable sensing device.

    amplitude and phase represent per-subcarrier CSI values. RSSI is accepted as
    metadata only; the detection pipeline uses CSI-derived features.
    """

    device_id: str
    room_id: str
    amplitude: list[float]
    phase: list[float]
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    rssi: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "device_id": self.device_id,
            "room_id": self.room_id,
            "amplitude": self.amplitude,
            "phase": self.phase,
            "timestamp": self.timestamp,
            "rssi": self.rssi,
            "metadata": self.metadata,
        }


class CSIReadingError(RuntimeError):
    pass


class CSICollector(ABC):
    """Abstract hardware boundary for ESP32, Linux NIC, or simulator backends."""

    @abstractmethod
    async def connect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def disconnect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def read(self) -> CSIMeasurement:
        raise NotImplementedError

    @abstractmethod
    def status(self) -> dict[str, Any]:
        raise NotImplementedError
