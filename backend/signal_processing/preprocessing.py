from __future__ import annotations

import numpy as np

from csi.interface import CSIMeasurement


def _clip_outliers(values: np.ndarray, z_limit: float = 3.0) -> np.ndarray:
    median = np.median(values)
    mad = np.median(np.abs(values - median)) or 1.0
    z_score = 0.6745 * (values - median) / mad
    return np.where(np.abs(z_score) > z_limit, median, values)


def _moving_average(values: np.ndarray, window: int = 5) -> np.ndarray:
    if values.size < window:
        return values
    kernel = np.ones(window) / window
    return np.convolve(values, kernel, mode="same")


def preprocess_measurement(measurement: CSIMeasurement) -> dict[str, np.ndarray]:
    amplitude = np.asarray(measurement.amplitude, dtype=float)
    phase = np.unwrap(np.asarray(measurement.phase, dtype=float))

    amplitude = _moving_average(_clip_outliers(amplitude))
    phase = _moving_average(_clip_outliers(phase))

    amp_std = np.std(amplitude) or 1.0
    phase_std = np.std(phase) or 1.0
    amplitude_norm = (amplitude - np.mean(amplitude)) / amp_std
    phase_norm = (phase - np.mean(phase)) / phase_std

    return {
        "amplitude": amplitude,
        "phase": phase,
        "amplitude_norm": amplitude_norm,
        "phase_norm": phase_norm,
    }


def signal_quality(processed: dict[str, np.ndarray]) -> str:
    amp = processed["amplitude"]
    phase = processed["phase"]
    if amp.size < 16 or not np.isfinite(amp).all() or not np.isfinite(phase).all():
        return "UNSTABLE"
    if float(np.std(amp)) > 8.5 or float(np.std(np.diff(phase))) > 0.8:
        return "UNSTABLE"
    if float(np.std(amp)) > 5.5:
        return "NOISY"
    return "GOOD"
