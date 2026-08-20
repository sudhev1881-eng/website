from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SensorDatabase:
    """Small SQLite repository used by the CSI prototype."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        if not self.path.is_absolute():
            self.path = Path.cwd() / self.path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
        with self._lock, self._connect() as conn:
            conn.executescript(schema)
            conn.commit()

    def insert_sample(
        self,
        room_id: str,
        device_id: str,
        raw: dict[str, Any],
        features: dict[str, float],
        label: str | None = None,
    ) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO csi_samples (room_id, device_id, label, raw_json, features_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (room_id, device_id, label, json.dumps(raw), json.dumps(features), utc_now()),
            )
            conn.commit()
            return int(cur.lastrowid)

    def insert_prediction(
        self,
        room_id: str,
        status: str,
        confidence: float,
        motion: bool,
        signal_quality: str,
        features: dict[str, float],
    ) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO predictions (room_id, status, confidence, motion, signal_quality, features_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    room_id,
                    status,
                    confidence,
                    1 if motion else 0,
                    signal_quality,
                    json.dumps(features),
                    utc_now(),
                ),
            )
            conn.commit()
            return int(cur.lastrowid)

    def latest_predictions(self, room_id: str, limit: int = 100) -> list[dict[str, Any]]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT status, confidence, motion, signal_quality, created_at
                FROM predictions
                WHERE room_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (room_id, limit),
            ).fetchall()
        return [
            {
                "status": row["status"],
                "confidence": float(row["confidence"]),
                "motion": bool(row["motion"]),
                "signal_quality": row["signal_quality"],
                "timestamp": row["created_at"],
            }
            for row in rows
        ]

    def prediction_timeline(self, room_id: str, limit: int = 300) -> list[dict[str, Any]]:
        rows = list(reversed(self.latest_predictions(room_id, limit)))
        return rows

    def create_training_session(self, room_id: str, name: str, notes: str | None = None) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO training_sessions (room_id, name, notes, started_at)
                VALUES (?, ?, ?, ?)
                """,
                (room_id, name, notes, utc_now()),
            )
            conn.commit()
            return int(cur.lastrowid)

    def complete_training_session(self, session_id: int) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "UPDATE training_sessions SET completed_at = ? WHERE id = ?",
                (utc_now(), session_id),
            )
            conn.commit()

    def labeled_feature_rows(self, room_id: str) -> list[tuple[str, dict[str, float]]]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT label, features_json
                FROM csi_samples
                WHERE room_id = ? AND label IS NOT NULL
                ORDER BY created_at ASC
                """,
                (room_id,),
            ).fetchall()
        return [(row["label"], json.loads(row["features_json"])) for row in rows]

    def label_counts(self, room_id: str) -> dict[str, int]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT label, COUNT(*) AS count
                FROM csi_samples
                WHERE room_id = ? AND label IS NOT NULL
                GROUP BY label
                """,
                (room_id,),
            ).fetchall()
        return {row["label"]: int(row["count"]) for row in rows}

    def record_calibration_step(
        self,
        room_id: str,
        step: str,
        status: str,
        metrics: dict[str, Any] | None = None,
    ) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO calibration_runs (room_id, step, status, metrics_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (room_id, step, status, json.dumps(metrics or {}), utc_now()),
            )
            conn.commit()
            return int(cur.lastrowid)
