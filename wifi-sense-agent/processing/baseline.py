from __future__ import annotations

from collections import deque


class AdaptiveBaseline:
    """Slow EMA baseline for RSSI-like metrics (dBm)."""

    def __init__(self, ema_alpha: float = 0.02) -> None:
        self._alpha = ema_alpha
        self._value: float | None = None
        self._quiet_window: deque[float] = deque(maxlen=120)

    @property
    def value(self) -> float | None:
        return self._value

    def observe(self, metric_dbm: float, *, quiet: bool) -> float | None:
        if self._value is None:
            self._value = metric_dbm
        else:
            self._value = (1.0 - self._alpha) * self._value + self._alpha * metric_dbm
        if quiet:
            self._quiet_window.append(metric_dbm)
        return self._value

    def quiet_median(self) -> float | None:
        if not self._quiet_window:
            return None
        ordered = sorted(self._quiet_window)
        mid = len(ordered) // 2
        if len(ordered) % 2:
            return ordered[mid]
        return 0.5 * (ordered[mid - 1] + ordered[mid])

    def reset(self) -> None:
        self._value = None
        self._quiet_window.clear()
