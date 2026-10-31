from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass


@dataclass
class MotionState:
    motion_detected: bool
    intensity: float
    confidence: float
    variance: float
    delta_dbm: float


class MotionDetector:
    def __init__(
        self,
        window_sec: float = 2.0,
        poll_hz: float = 8.0,
        on_threshold: float = 0.35,
        off_threshold: float = 0.22,
    ) -> None:
        maxlen = max(4, int(window_sec * poll_hz))
        self._residuals: deque[float] = deque(maxlen=maxlen)
        self._motion = False
        self._on_threshold = on_threshold
        self._off_threshold = off_threshold
        self._calibrated_threshold: float | None = None

    def set_calibrated_threshold(self, value: float | None) -> None:
        self._calibrated_threshold = value

    def update(self, metric_dbm: float, baseline_dbm: float | None) -> MotionState:
        if baseline_dbm is None or not math.isfinite(metric_dbm):
            return MotionState(False, 0.0, 0.0, 0.0, 0.0)

        delta = metric_dbm - baseline_dbm
        self._residuals.append(delta)

        if len(self._residuals) < 3:
            return MotionState(self._motion, 0.0, 0.2, 0.0, delta)

        mean = sum(self._residuals) / len(self._residuals)
        var = sum((x - mean) ** 2 for x in self._residuals) / len(self._residuals)
        rms = math.sqrt(max(var, 0.0))

        # Map ~0–3 dB RMS to 0–1 intensity
        intensity = min(1.0, rms / 3.0)
        on_t = self._calibrated_threshold if self._calibrated_threshold is not None else self._on_threshold
        off_t = min(on_t * 0.65, self._off_threshold)

        if not self._motion and intensity >= on_t:
            self._motion = True
        elif self._motion and intensity <= off_t:
            self._motion = False

        confidence = min(1.0, 0.25 + len(self._residuals) / self._residuals.maxlen * 0.75)
        if rms < 0.05:
            confidence *= 0.5

        return MotionState(self._motion, intensity, confidence, var, delta)
