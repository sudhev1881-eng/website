from __future__ import annotations

import asyncio
from typing import Any

from csi.interface import CSICollector
from database.db import SensorDatabase
from ml.model import PresenceModel
from signal_processing.features import extract_features
from signal_processing.preprocessing import preprocess_measurement


async def collect_labeled_samples(
    collector: CSICollector,
    database: SensorDatabase,
    label: str,
    sample_count: int,
) -> dict[str, Any]:
    saved = 0
    for _ in range(sample_count):
        measurement = await collector.read()
        processed = preprocess_measurement(measurement)
        features = extract_features(processed)
        database.insert_sample(measurement.room_id, measurement.device_id, measurement.as_dict(), features, label)
        saved += 1
        await asyncio.sleep(0)
    return {"label": label, "samples_saved": saved}


async def train_from_database(database: SensorDatabase, model: PresenceModel, room_id: str) -> dict[str, Any]:
    rows = database.labeled_feature_rows(room_id)
    metrics = model.train(rows)
    return {"room_id": room_id, **metrics, "label_counts": database.label_counts(room_id)}
