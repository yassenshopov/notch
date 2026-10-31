from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


ConnectionState = Literal[
    "disconnected",
    "connected_no_data",
    "calibration_required",
    "live",
    "stale",
    "demo",
]


class HealthResponse(BaseModel):
    ok: bool
    service: str = "wifi-sense-agent"


class RespirationPayload(BaseModel):
    supported: bool
    trustworthy: bool = False
    breaths_per_min: float | None = None
    confidence: float = 0.0
    reason: str = ""
    waveform: list[float] = Field(default_factory=list)


class SamplePayload(BaseModel):
    ts: float
    metric_dbm: float
    signal_dbm: float | None = None
    beacon_signal_avg_dbm: float | None = None
    baseline_dbm: float | None = None
    motion_detected: bool
    intensity: float
    confidence: float
    variance: float = 0.0
    delta_dbm: float = 0.0
    source: str
    bssid: str | None = None
    respiration: RespirationPayload


class StatusResponse(BaseModel):
    uptime_sec: float
    connection_state: ConnectionState
    calibration_required: bool
    calibration: dict[str, Any]
    calibration_step: str | None = None
    recording: bool
    poll_hz: float
    poll_errors: int
    last_sample_ts: float | None
    demo_mode: bool
    hardware: dict[str, Any]
    measurement_mode: str
    csi: str


class CalibrationStepBody(BaseModel):
    step: str
