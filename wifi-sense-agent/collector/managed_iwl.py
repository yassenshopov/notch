from __future__ import annotations

import re
import subprocess
import time
from dataclasses import dataclass

try:
    from pyroute2 import NDB
except ImportError:  # pragma: no cover
    NDB = None  # type: ignore


@dataclass
class StationSample:
    ts: float
    bssid: str | None
    signal_dbm: float | None
    signal_chain_dbm: tuple[float, ...]
    signal_avg_dbm: float | None
    beacon_signal_avg_dbm: float | None
    rx_packets: int | None
    tx_packets: int | None
    inactive_ms: int | None
    source: str


_SIGNAL_RE = re.compile(r"^\s*signal:\s+(-?\d+(?:\.\d+)?)", re.MULTILINE)
_SIGNAL_CHAIN_RE = re.compile(
    r"^\s*signal:\s+-?\d+(?:\.\d+)?\s+\[([^\]]+)\]",
    re.MULTILINE,
)
_SIGNAL_AVG_RE = re.compile(r"^\s*signal avg:\s+(-?\d+(?:\.\d+)?)", re.MULTILINE)
_BEACON_AVG_RE = re.compile(r"^\s*beacon signal avg:\s+(-?\d+(?:\.\d+)?)", re.MULTILINE)
_RX_PKTS_RE = re.compile(r"^\s*rx packets:\s+(\d+)", re.MULTILINE)
_TX_PKTS_RE = re.compile(r"^\s*tx packets:\s+(\d+)", re.MULTILINE)
_INACTIVE_RE = re.compile(r"^\s*inactive time:\s+(\d+)", re.MULTILINE)
_STATION_MAC_RE = re.compile(r"^Station\s+([0-9a-f:]+)", re.MULTILINE)


def _parse_chain(raw: str) -> tuple[float, ...]:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    out: list[float] = []
    for p in parts:
        try:
            out.append(float(p))
        except ValueError:
            continue
    return tuple(out)


def parse_iw_station_dump(text: str, ts: float | None = None) -> StationSample | None:
    if not text.strip():
        return None
    mac = _STATION_MAC_RE.search(text)
    sig = _SIGNAL_RE.search(text)
    chain = _SIGNAL_CHAIN_RE.search(text)
    sig_avg = _SIGNAL_AVG_RE.search(text)
    beacon = _BEACON_AVG_RE.search(text)
    rx = _RX_PKTS_RE.search(text)
    tx = _TX_PKTS_RE.search(text)
    inactive = _INACTIVE_RE.search(text)

    signal_dbm = float(sig.group(1)) if sig else None
    chain_vals = _parse_chain(chain.group(1)) if chain else ()
    signal_avg = float(sig_avg.group(1)) if sig_avg else None
    beacon_avg = float(beacon.group(1)) if beacon else None

    primary = beacon_avg if beacon_avg is not None else (signal_avg if signal_avg is not None else signal_dbm)
    if primary is None:
        return None

    return StationSample(
        ts=ts if ts is not None else time.time(),
        bssid=mac.group(1) if mac else None,
        signal_dbm=signal_dbm,
        signal_chain_dbm=chain_vals,
        signal_avg_dbm=signal_avg,
        beacon_signal_avg_dbm=beacon_avg,
        rx_packets=int(rx.group(1)) if rx else None,
        tx_packets=int(tx.group(1)) if tx else None,
        inactive_ms=int(inactive.group(1)) if inactive else None,
        source="iw",
    )


def collect_via_iw(iface: str) -> StationSample | None:
    try:
        proc = subprocess.run(
            ["iw", "dev", iface, "station", "dump"],
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    return parse_iw_station_dump(proc.stdout)


def collect_via_ndb(iface: str) -> StationSample | None:
    if NDB is None:
        return None
    try:
        with NDB() as ndb:
            if iface not in ndb.interfaces:
                return None
            wlan = ndb.interfaces[iface]
            stats = wlan.get("statistics", {})
            wifi = wlan.get("wifi", {})
            signal = wifi.get("signal") or stats.get("signal")
            if signal is None:
                return None
            if isinstance(signal, dict):
                signal_dbm = signal.get("dBm") or signal.get("dbm")
            else:
                signal_dbm = signal
            if signal_dbm is None:
                return None
            return StationSample(
                ts=time.time(),
                bssid=str(wifi.get("bssid") or wifi.get("connected") or "") or None,
                signal_dbm=float(signal_dbm),
                signal_chain_dbm=(),
                signal_avg_dbm=float(signal_dbm),
                beacon_signal_avg_dbm=None,
                rx_packets=int(stats.get("rx_packets", 0)) if stats.get("rx_packets") is not None else None,
                tx_packets=int(stats.get("tx_packets", 0)) if stats.get("tx_packets") is not None else None,
                inactive_ms=None,
                source="ndb",
            )
    except Exception:
        return None


def collect_station(iface: str) -> StationSample | None:
    sample = collect_via_iw(iface)
    if sample is not None:
        return sample
    return collect_via_ndb(iface)


def primary_metric(sample: StationSample) -> float:
    if sample.beacon_signal_avg_dbm is not None:
        return sample.beacon_signal_avg_dbm
    if sample.signal_avg_dbm is not None:
        return sample.signal_avg_dbm
    if sample.signal_dbm is not None:
        return sample.signal_dbm
    return float("nan")
