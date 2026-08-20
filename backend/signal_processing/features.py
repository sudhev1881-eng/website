from __future__ import annotations

import numpy as np

CSI_FEATURE_NAMES = [
    "amp_mean",
    "amp_std",
    "amp_range",
    "amp_iqr",
    "amp_energy",
    "amp_diff_mean",
    "amp_diff_std",
    "phase_std",
    "phase_range",
    "phase_diff_std",
    "norm_amp_energy",
    "norm_phase_energy",
]


def _iqr(values: np.ndarray) -> float:
    return float(np.percentile(values, 75) - np.percentile(values, 25))


def extract_features(processed: dict[str, np.ndarray]) -> dict[str, float]:
    amp = processed["amplitude"]
    phase = processed["phase"]
    amp_norm = processed["amplitude_norm"]
    phase_norm = processed["phase_norm"]
    amp_diff = np.diff(amp)
    phase_diff = np.diff(phase)

    features = {
        "amp_mean": float(np.mean(amp)),
        "amp_std": float(np.std(amp)),
        "amp_range": float(np.max(amp) - np.min(amp)),
        "amp_iqr": _iqr(amp),
        "amp_energy": float(np.mean(np.square(amp))),
        "amp_diff_mean": float(np.mean(np.abs(amp_diff))) if amp_diff.size else 0.0,
        "amp_diff_std": float(np.std(amp_diff)) if amp_diff.size else 0.0,
        "phase_std": float(np.std(phase)),
        "phase_range": float(np.max(phase) - np.min(phase)),
        "phase_diff_std": float(np.std(phase_diff)) if phase_diff.size else 0.0,
        "norm_amp_energy": float(np.mean(np.square(amp_norm))),
        "norm_phase_energy": float(np.mean(np.square(phase_norm))),
    }
    return {name: features[name] for name in CSI_FEATURE_NAMES}


def vectorize(features: dict[str, float]) -> list[float]:
    return [float(features[name]) for name in CSI_FEATURE_NAMES]
