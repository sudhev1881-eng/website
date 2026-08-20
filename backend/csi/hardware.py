from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from .interface import CSICollector, CSIMeasurement, CSIReadingError


class JsonLineCSICollector(CSICollector):
    """Generic adapter for real CSI tools that emit JSON lines.

    ESP32 CSI serial bridges or Linux CSI utilities can write lines with:
    {"device_id":"esp32-1","room_id":"lab","amplitude":[...],"phase":[...],"rssi":-51}

    The rest of the application stays unchanged when this collector replaces the
    simulator. Device-specific serial/socket code should terminate in this JSON
    contract instead of leaking hardware details into the ML pipeline.
    """

    def __init__(self, source_path: str | Path, room_id: str, device_id: str = "csi-hardware"):
        self.source_path = Path(source_path)
        self.room_id = room_id
        self.device_id = device_id
        self.connected = False
        self._offset = 0

    async def connect(self) -> None:
        if not self.source_path.exists():
            raise CSIReadingError(f"CSI source {self.source_path} does not exist")
        self.connected = True

    async def disconnect(self) -> None:
        self.connected = False

    async def read(self) -> CSIMeasurement:
        if not self.connected:
            await self.connect()
        while True:
            with self.source_path.open("r", encoding="utf-8") as handle:
                handle.seek(self._offset)
                line = handle.readline()
                self._offset = handle.tell()
            if line:
                try:
                    payload = json.loads(line)
                    return CSIMeasurement(
                        device_id=payload.get("device_id", self.device_id),
                        room_id=payload.get("room_id", self.room_id),
                        amplitude=[float(v) for v in payload["amplitude"]],
                        phase=[float(v) for v in payload["phase"]],
                        rssi=float(payload["rssi"]) if payload.get("rssi") is not None else None,
                        metadata={"mode": "jsonl", **payload.get("metadata", {})},
                    )
                except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                    raise CSIReadingError(f"Invalid CSI JSON line: {exc}") from exc
            await asyncio.sleep(0.05)

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.connected,
            "device_id": self.device_id,
            "mode": "jsonl-hardware-adapter",
            "source_path": str(self.source_path),
            "message": "Waiting for real CSI JSON lines from ESP32/Linux adapter bridge.",
        }
