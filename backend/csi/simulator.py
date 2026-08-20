from __future__ import annotations

import asyncio
import math
import random
from typing import Any, Literal

import numpy as np

from .interface import CSICollector, CSIMeasurement

SimulatorState = Literal["EMPTY", "OCCUPIED", "MOTION", "UNSTABLE"]


class SimulatedCSICollector(CSICollector):
    """CSI-like generator for development without sensing hardware.

    It creates stable empty-room subcarrier magnitudes, then applies amplitude
    fades and phase perturbations when a person is present or moving. This is not
    RSSI presence detection; RSSI is emitted only as optional metadata.
    """

    def __init__(
        self,
        room_id: str,
        device_id: str = "sim-csi-001",
        sample_rate_hz: float = 8.0,
        subcarriers: int = 64,
    ):
        self.room_id = room_id
        self.device_id = device_id
        self.sample_rate_hz = sample_rate_hz
        self.subcarriers = subcarriers
        self.connected = False
        self.state: SimulatorState = "EMPTY"
        self._tick = 0
        carrier_axis = np.linspace(0, 2 * math.pi, subcarriers)
        self._base_amp = 42 + 4 * np.sin(carrier_axis) + np.random.normal(0, 0.4, subcarriers)
        self._base_phase = np.unwrap(np.sin(carrier_axis / 2) * 0.35)

    async def connect(self) -> None:
        self.connected = True

    async def disconnect(self) -> None:
        self.connected = False

    async def read(self) -> CSIMeasurement:
        if not self.connected:
            await self.connect()
        await asyncio.sleep(max(0.01, 1 / self.sample_rate_hz))
        self._tick += 1

        drift = 0.35 * math.sin(self._tick / 40)
        noise = 0.55 if self.state != "UNSTABLE" else 4.5
        amp = self._base_amp + drift + np.random.normal(0, noise, self.subcarriers)
        phase = self._base_phase + np.random.normal(0, 0.035 if self.state != "UNSTABLE" else 0.45, self.subcarriers)

        if self.state in {"OCCUPIED", "MOTION"}:
            fade_center = (self._tick * (0.55 if self.state == "MOTION" else 0.12)) % self.subcarriers
            idx = np.arange(self.subcarriers)
            fade = np.exp(-((idx - fade_center) ** 2) / (2 * 8.0**2))
            amp -= fade * (4.5 if self.state == "OCCUPIED" else 9.0)
            phase += fade * (0.22 if self.state == "OCCUPIED" else 0.55)

        if self.state == "MOTION":
            amp += 2.2 * np.sin(np.linspace(0, 6 * math.pi, self.subcarriers) + self._tick / 2)
            phase += 0.18 * np.sin(np.linspace(0, 4 * math.pi, self.subcarriers) + self._tick / 3)

        rssi = float(-43 - np.std(amp) * 0.18 + random.uniform(-1.2, 1.2))
        return CSIMeasurement(
            device_id=self.device_id,
            room_id=self.room_id,
            amplitude=amp.round(4).tolist(),
            phase=phase.round(4).tolist(),
            rssi=rssi,
            metadata={"mode": "simulated", "simulator_state": self.state, "subcarriers": self.subcarriers},
        )

    def set_state(self, state: SimulatorState) -> None:
        self.state = state

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.connected,
            "device_id": self.device_id,
            "mode": "simulated",
            "state": self.state,
            "sample_rate_hz": self.sample_rate_hz,
            "message": "Simulated CSI stream active; replace collector for real CSI hardware.",
        }
