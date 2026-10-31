from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass
class RespirationEstimate:
    supported: bool
    trustworthy: bool
    breaths_per_min: float | None
    waveform: list[float]
    confidence: float
    reason: str


class RespirationAnalyzer:
    """
    Experimental breathing estimate from detrended RSSI.
    Returns unsupported unless quality gates pass.
    """

    def __init__(self, min_samples: int = 240) -> None:
        self._min_samples = min_samples
        self._enabled = False

    def set_enabled(self, enabled: bool) -> None:
        self._enabled = enabled

    def analyze(self, series: list[float], sample_hz: float) -> RespirationEstimate:
        empty = RespirationEstimate(
            supported=False,
            trustworthy=False,
            breaths_per_min=None,
            waveform=[],
            confidence=0.0,
            reason="unsupported_on_managed_rssi",
        )
        if not self._enabled:
            return empty

        if len(series) < self._min_samples:
            return RespirationEstimate(
                supported=True,
                trustworthy=False,
                breaths_per_min=None,
                waveform=[],
                confidence=0.0,
                reason="insufficient_samples",
            )

        x = np.asarray(series, dtype=np.float64)
        x = x - np.mean(x)
        if np.std(x) < 0.08:
            return RespirationEstimate(
                supported=True,
                trustworthy=False,
                breaths_per_min=None,
                waveform=[],
                confidence=0.0,
                reason="signal_too_flat",
            )

        fs = max(sample_hz, 0.1)
        freqs = np.fft.rfftfreq(len(x), d=1.0 / fs)
        spectrum = np.abs(np.fft.rfft(x))
        band = (freqs >= 0.1) & (freqs <= 0.5)
        if not np.any(band):
            return RespirationEstimate(
                supported=True,
                trustworthy=False,
                breaths_per_min=None,
                waveform=[],
                confidence=0.0,
                reason="no_breathing_band",
            )

        band_spec = spectrum.copy()
        band_spec[~band] = 0.0
        peak_idx = int(np.argmax(band_spec))
        peak_power = float(band_spec[peak_idx])
        total = float(np.sum(spectrum[1:]) + 1e-9)
        peak_ratio = peak_power / total
        bpm = float(freqs[peak_idx] * 60.0)

        trustworthy = peak_ratio > 0.12 and 8.0 <= bpm <= 30.0
        waveform = x[-min(120, len(x)) :].tolist()

        return RespirationEstimate(
            supported=True,
            trustworthy=trustworthy,
            breaths_per_min=bpm if trustworthy else None,
            waveform=waveform if trustworthy else [],
            confidence=min(1.0, peak_ratio * 3.0) if trustworthy else peak_ratio,
            reason="ok" if trustworthy else "low_confidence",
        )
