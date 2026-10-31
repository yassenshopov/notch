from __future__ import annotations

import asyncio
import csv
import math
import time
from dataclasses import dataclass
from typing import Any

from agent.config import AgentConfig
from collector.managed_iwl import collect_station, primary_metric
from processing.baseline import AdaptiveBaseline
from processing.motion import MotionDetector
from processing.respiration import RespirationAnalyzer
from storage.sqlite import HistoryStore


@dataclass
class LiveFrame:
    type: str
    payload: dict[str, Any]


class SensorEngine:
    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.store = HistoryStore(config.db_path)
        self.baseline = AdaptiveBaseline()
        self.motion = MotionDetector(poll_hz=config.poll_hz)
        self.respiration = RespirationAnalyzer()
        self._metric_series: list[float] = []
        self._last_sample_ts: float | None = None
        self._last_motion = False
        self._poll_errors = 0
        self._calibration_step: str | None = None
        self._calibration_buffer: list[float] = []
        self._empty_room_samples: list[float] = []
        self._recording = False
        self._recording_label = ""
        self._recording_rows: list[dict[str, Any]] = []
        self._subscribers: list[asyncio.Queue[LiveFrame]] = []
        self._task: asyncio.Task | None = None
        self._started = time.time()
        self._apply_calibration()

    def _apply_calibration(self) -> None:
        cal = self.store.get_calibration()
        threshold = cal.get("threshold")
        if isinstance(threshold, (int, float)) and threshold > 0:
            self.motion.set_calibrated_threshold(float(threshold))

    @property
    def calibration_required(self) -> bool:
        return not self.store.get_calibration().get("completed", False)

    def subscribe(self) -> asyncio.Queue[LiveFrame]:
        q: asyncio.Queue[LiveFrame] = asyncio.Queue(maxsize=256)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[LiveFrame]) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def _broadcast(self, frame: LiveFrame) -> None:
        dead: list[asyncio.Queue[LiveFrame]] = []
        for q in self._subscribers:
            try:
                q.put_nowait(frame)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.unsubscribe(q)

    async def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._loop(), name="wifi-sense-poll")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def _loop(self) -> None:
        interval = 1.0 / max(self.config.poll_hz, 0.5)
        prune_counter = 0
        while True:
            await self._tick()
            prune_counter += 1
            if prune_counter >= int(max(60, 3600 * interval)):
                self.store.prune_old_samples(self.config.raw_retention_days)
                prune_counter = 0
            await asyncio.sleep(interval)

    async def _tick_demo(self) -> None:
        ts = time.time()
        t = ts - self._started
        metric = -40.0 + 2.0 * math.sin(t * 0.7)
        state = self.motion.update(metric, -41.0)
        payload = self._payload(ts, metric, -42.0, -41.0, state, source="demo")
        await self._emit_sample(payload)

    async def _tick(self) -> None:
        if self.config.demo_mode:
            await self._tick_demo()
            return

        sample = await asyncio.to_thread(collect_station, self.config.iface)
        if sample is None:
            self._poll_errors += 1
            await self._broadcast(LiveFrame("status", {"collector_ok": False, "poll_errors": self._poll_errors}))
            return

        metric = primary_metric(sample)
        if not math.isfinite(metric):
            self._poll_errors += 1
            return

        self._poll_errors = 0
        self._last_sample_ts = sample.ts
        quiet = not self._last_motion and self._calibration_step in (None, "empty", "sit")
        baseline = self.baseline.observe(metric, quiet=quiet)
        state = self.motion.update(metric, baseline)

        if state.motion_detected != self._last_motion:
            kind = "motion_on" if state.motion_detected else "motion_off"
            self.store.insert_motion_event(sample.ts, kind, state.intensity, state.confidence)
            await self._broadcast(
                LiveFrame(
                    "motion",
                    {
                        "ts": sample.ts,
                        "kind": kind,
                        "intensity": state.intensity,
                        "confidence": state.confidence,
                    },
                )
            )
        self._last_motion = state.motion_detected

        self.store.insert_sample(
            sample.ts,
            metric,
            sample.signal_dbm,
            sample.beacon_signal_avg_dbm,
            state.motion_detected,
            state.intensity,
            state.confidence,
        )

        self._metric_series.append(metric)
        if len(self._metric_series) > 2048:
            self._metric_series = self._metric_series[-2048:]

        if self._recording:
            self._recording_rows.append(
                {
                    "ts": sample.ts,
                    "metric_dbm": metric,
                    "motion": int(state.motion_detected),
                    "intensity": state.intensity,
                }
            )

        if self._calibration_step:
            self._calibration_buffer.append(metric)

        payload = self._payload(
            sample.ts,
            metric,
            sample.signal_dbm,
            sample.beacon_signal_avg_dbm,
            state,
            source=sample.source,
            bssid=sample.bssid,
        )
        await self._emit_sample(payload)

    def _payload(
        self,
        ts: float,
        metric: float,
        signal_dbm: float | None,
        beacon_avg: float | None,
        state,
        *,
        source: str,
        bssid: str | None = None,
    ) -> dict[str, Any]:
        resp = self.respiration.analyze(self._metric_series, self.config.poll_hz)
        return {
            "ts": ts,
            "metric_dbm": metric,
            "signal_dbm": signal_dbm,
            "beacon_signal_avg_dbm": beacon_avg,
            "baseline_dbm": self.baseline.value,
            "motion_detected": state.motion_detected,
            "intensity": state.intensity,
            "confidence": state.confidence,
            "variance": state.variance,
            "delta_dbm": state.delta_dbm,
            "source": source,
            "bssid": bssid,
            "respiration": {
                "supported": resp.supported,
                "trustworthy": resp.trustworthy,
                "breaths_per_min": resp.breaths_per_min,
                "confidence": resp.confidence,
                "reason": resp.reason,
                "waveform": resp.waveform,
            },
        }

    async def _emit_sample(self, payload: dict[str, Any]) -> None:
        await self._broadcast(LiveFrame("sample", payload))

    def connection_state(self) -> str:
        if self.config.demo_mode:
            return "demo"
        if self._last_sample_ts is None:
            return "connected_no_data" if self._poll_errors == 0 else "connected_no_data"
        if time.time() - self._last_sample_ts > self.config.stale_after_sec:
            return "stale"
        if self.calibration_required:
            return "calibration_required"
        return "live"

    def status_dict(self, hardware: dict) -> dict[str, Any]:
        cal = self.store.get_calibration()
        return {
            "uptime_sec": time.time() - self._started,
            "connection_state": self.connection_state(),
            "calibration_required": self.calibration_required,
            "calibration": cal,
            "calibration_step": self._calibration_step,
            "recording": self._recording,
            "poll_hz": self.config.poll_hz,
            "poll_errors": self._poll_errors,
            "last_sample_ts": self._last_sample_ts,
            "demo_mode": self.config.demo_mode,
            "hardware": hardware,
            "measurement_mode": "managed_rssi",
            "csi": "unsupported",
        }

    def start_calibration(self) -> None:
        self._calibration_step = "empty"
        self._calibration_buffer = []
        self._empty_room_samples = []
        self.store.reset_calibration()
        self.baseline.reset()
        self.motion.set_calibrated_threshold(None)

    def advance_calibration(self, step: str) -> None:
        allowed = {"empty", "enter", "sit", "walk", "breathing"}
        if step not in allowed:
            raise ValueError(f"unknown step {step}")
        if self._calibration_step == "empty" and self._calibration_buffer:
            self._empty_room_samples = list(self._calibration_buffer)
        self._calibration_step = step

    def finish_calibration(self) -> dict[str, Any]:
        if len(self._calibration_buffer) < 8:
            raise ValueError("no calibration samples — wait a few seconds on a step, then Finish")
        empty = self._empty_room_samples if self._empty_room_samples else self._calibration_buffer
        mean = sum(empty) / len(empty)
        var = sum((x - mean) ** 2 for x in empty) / len(empty)
        threshold = max(0.15, min(0.85, math.sqrt(var) / 3.0 + 0.12))
        profile = {"samples": len(self._calibration_buffer), "step": self._calibration_step}
        self.store.save_calibration(empty_room_var=var, threshold=threshold, profile=profile)
        self.motion.set_calibrated_threshold(threshold)
        self._calibration_step = None
        self._calibration_buffer = []
        return self.store.get_calibration()

    def start_recording(self, label: str = "") -> None:
        self._recording = True
        self._recording_rows = []
        self._recording_label = label

    def stop_recording(self) -> str | None:
        if not self._recording:
            return None
        self._recording = False
        path = f"/tmp/wifi-sense-recording-{int(time.time())}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["ts", "metric_dbm", "motion", "intensity"])
            writer.writeheader()
            writer.writerows(self._recording_rows)
        return path
