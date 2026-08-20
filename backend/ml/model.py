from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from signal_processing.features import CSI_FEATURE_NAMES, vectorize

OCCUPIED_LABELS = {"OCCUPIED", "PERSON_ENTERS", "PERSON_STANDING", "PERSON_SITTING", "PERSON_MOVING", "MOTION"}
EMPTY_LABELS = {"EMPTY", "ROOM_EMPTY", "PERSON_LEAVES"}


def normalize_label(label: str) -> str:
    upper = label.strip().upper().replace(" ", "_")
    if upper in OCCUPIED_LABELS:
        return "OCCUPIED"
    if upper in EMPTY_LABELS:
        return "EMPTY"
    raise ValueError(f"Unsupported training label: {label}")


class PresenceModel:
    """Baseline Random Forest classifier for EMPTY vs OCCUPIED CSI features."""

    def __init__(self, model_path: str | Path):
        self.model_path = Path(model_path)
        if not self.model_path.is_absolute():
            self.model_path = Path.cwd() / self.model_path
        self.model: RandomForestClassifier | None = None
        self.metrics: dict[str, Any] = {}
        self.feature_names = CSI_FEATURE_NAMES
        self.load()

    @property
    def trained(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        if not self.model_path.exists():
            return
        artifact = joblib.load(self.model_path)
        self.model = artifact["model"]
        self.metrics = artifact.get("metrics", {})
        self.feature_names = artifact.get("feature_names", CSI_FEATURE_NAMES)

    def save(self) -> None:
        if self.model is None:
            return
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"model": self.model, "metrics": self.metrics, "feature_names": self.feature_names},
            self.model_path,
        )

    def train(self, rows: list[tuple[str, dict[str, float]]]) -> dict[str, Any]:
        if len(rows) < 20:
            raise ValueError("At least 20 labeled samples are required to train")
        y = [normalize_label(label) for label, _ in rows]
        if len(set(y)) < 2:
            raise ValueError("Training requires both EMPTY and OCCUPIED labels")
        x = np.asarray([vectorize(features) for _, features in rows], dtype=float)

        stratify = y if min(y.count("EMPTY"), y.count("OCCUPIED")) >= 2 else None
        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.25,
            random_state=42,
            stratify=stratify,
        )
        model = RandomForestClassifier(n_estimators=160, random_state=42, class_weight="balanced")
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        self.model = model
        self.metrics = {
            "accuracy": float(accuracy_score(y_test, predictions)),
            "samples": len(rows),
            "classes": sorted(set(y)),
            "feature_names": self.feature_names,
        }
        self.save()
        return self.metrics

    def predict(self, features: dict[str, float]) -> dict[str, Any]:
        if self.model is None:
            raise RuntimeError("Presence model is not trained")
        vector = np.asarray([vectorize(features)], dtype=float)
        probabilities = self.model.predict_proba(vector)[0]
        classes = list(self.model.classes_)
        best_index = int(np.argmax(probabilities))
        status = str(classes[best_index])
        confidence = float(probabilities[best_index])
        return {"status": status, "confidence": confidence, "probabilities": dict(zip(classes, map(float, probabilities)))}
