from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(slots=True)
class PredictionSmoother:
    window_size: int = 7
    min_confidence: float = 0.58
    history: deque[dict[str, Any]] = field(default_factory=deque)
    current_status: str = "SIGNAL_UNSTABLE"
    last_change: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def smooth(self, status: str, confidence: float, motion: bool, signal_quality: str) -> dict[str, Any]:
        timestamp = datetime.now(timezone.utc).isoformat()
        raw_status = "SIGNAL_UNSTABLE" if signal_quality == "UNSTABLE" else status
        self.history.append({"status": raw_status, "confidence": confidence, "motion": motion, "timestamp": timestamp})
        while len(self.history) > self.window_size:
            self.history.popleft()

        counts = Counter(item["status"] for item in self.history)
        majority_status, majority_count = counts.most_common(1)[0]
        avg_confidence = sum(float(item["confidence"]) for item in self.history) / len(self.history)
        smoothed_status = majority_status
        if avg_confidence < self.min_confidence and signal_quality != "UNSTABLE":
            smoothed_status = self.current_status if self.current_status != "SIGNAL_UNSTABLE" else status
        if majority_count < max(2, self.window_size // 2):
            smoothed_status = self.current_status

        if smoothed_status != self.current_status:
            self.current_status = smoothed_status
            self.last_change = timestamp

        return {
            "status": self.current_status,
            "confidence": round(avg_confidence, 4),
            "motion": motion,
            "signal_quality": signal_quality,
            "timestamp": timestamp,
            "last_change": self.last_change,
        }
