#!/usr/bin/env python3
"""Collect host stats, persist trend samples on disk, emit JSON for Notch SSH polls."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

MAX_POINTS = int(os.environ.get("NOTCH_STATS_MAX_POINTS", "120"))
MAX_AGE_SEC = int(os.environ.get("NOTCH_STATS_MAX_AGE_SEC", str(24 * 3600)))
MIN_GAP_SEC = int(os.environ.get("NOTCH_STATS_MIN_GAP_SEC", "20"))


def run(cmd: str) -> str:
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""


def history_path() -> Path:
    raw = os.environ.get("NOTCH_STATS_HISTORY", "")
    if raw.strip():
        return Path(raw).expanduser()
    return Path.home() / ".cache" / "notch" / "server-stats.jsonl"


def load_samples(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    samples: list[dict] = []
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(row, dict) and row.get("t"):
                samples.append(row)
    except OSError:
        return []
    return samples


def prune_samples(samples: list[dict]) -> list[dict]:
    now = time.time()
    kept: list[dict] = []
    for row in samples:
        try:
            ts = datetime.fromisoformat(str(row["t"]).replace("Z", "+00:00")).timestamp()
        except (TypeError, ValueError):
            continue
        if now - ts > MAX_AGE_SEC:
            continue
        kept.append(row)
    if len(kept) > MAX_POINTS:
        kept = kept[-MAX_POINTS:]
    return kept


def append_sample(metrics: dict, path: Path) -> list[dict]:
    path.parent.mkdir(parents=True, exist_ok=True)
    samples = prune_samples(load_samples(path))
    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    if samples:
        try:
            last_ts = datetime.fromisoformat(str(samples[-1]["t"]).replace("Z", "+00:00")).timestamp()
            if time.time() - last_ts < MIN_GAP_SEC:
                return samples
        except (TypeError, ValueError):
            pass
    row = {
        "t": now_iso,
        "memUsedPct": metrics.get("memUsedPct"),
        "diskUsedPct": metrics.get("diskUsedPct"),
        "load1": metrics.get("load1"),
        "cpuTempC": metrics.get("cpuTempC"),
        "swapUsedPct": metrics.get("swapUsedPct"),
    }
    samples.append(row)
    samples = prune_samples(samples)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text("\n".join(json.dumps(s) for s in samples) + "\n", encoding="utf-8")
    tmp.replace(path)
    return samples


def samples_to_trend(samples: list[dict]) -> dict:
    def series(key: str) -> list[dict]:
        out: list[dict] = []
        for row in samples:
            val = row.get(key)
            t = row.get("t")
            if t is None or val is None:
                continue
            try:
                num = float(val)
            except (TypeError, ValueError):
                continue
            if not (num == num):  # NaN
                continue
            out.append({"time": str(t), "value": num})
        return out

    return {
        "memPct": series("memUsedPct"),
        "diskPct": series("diskUsedPct"),
        "load1": series("load1"),
        "cpuTempC": series("cpuTempC"),
        "swapPct": series("swapUsedPct"),
    }


def read_cpu_temp_mint() -> float | None:
    preferred: list[float] = []
    fallback: list[float] = []
    for zone in Path("/sys/class/thermal").glob("thermal_zone*"):
        try:
            raw = (zone / "temp").read_text().strip()
            if not raw.isdigit():
                continue
            c = int(raw) / 1000
            if c < 15 or c > 110:
                continue
            label = (zone / "type").read_text().strip().lower()
            if any(k in label for k in ("x86", "cpu", "core", "pkg", "acpitz")):
                preferred.append(c)
            else:
                fallback.append(c)
        except OSError:
            continue
    if preferred:
        return round(max(preferred), 1)
    if fallback:
        return round(max(fallback), 1)
    raw = run("sensors 2>/dev/null | grep -E 'Package id|Tctl|Core 0' | head -1 | grep -oE '[0-9]+\\.[0-9]+' | head -1")
    if raw:
        try:
            c = float(raw)
            if 15 <= c <= 110:
                return round(c, 1)
        except ValueError:
            pass
    return None


def read_cpu_temp_pi() -> float | None:
    vc = run("vcgencmd measure_temp 2>/dev/null")
    if vc and "=" in vc:
        try:
            return float(vc.split("=")[1].strip().rstrip("'C"))
        except ValueError:
            pass
    raw = run("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null")
    if raw.isdigit():
        return round(int(raw) / 1000, 1)
    return None


def mirror_meta() -> tuple[int, str | None]:
    root = Path.home() / "github-mirror"
    repos = len(list(root.glob("*/*.git"))) if root.is_dir() else 0
    mirror_last: str | None = None
    log = root / "sync.log"
    if log.is_file():
        for line in reversed(log.read_text(errors="replace").splitlines()[-40:]):
            if "sync done" in line or "sync start" in line:
                mirror_last = line[:25]
                break
    return repos, mirror_last


def collect(flavor: str) -> dict:
    hostname = run("hostname -s") or run("hostname")
    uptime_s = int(float((run("cut -d. -f1 /proc/uptime") or "0").split()[0] or 0))

    load = (run("cut -d' ' -f1-3 /proc/loadavg") or "0 0 0").split()
    load_1, load_5, load_15 = (load + ["0", "0", "0"])[:3]

    mem_total_kb = int(run("grep MemTotal /proc/meminfo | awk '{print $2}'") or "0")
    mem_avail_kb = int(run("grep MemAvailable /proc/meminfo | awk '{print $2}'") or "0")
    mem_used_kb = max(0, mem_total_kb - mem_avail_kb)

    swap_total_kb = int(run("grep SwapTotal /proc/meminfo | awk '{print $2}'") or "0")
    swap_free_kb = int(run("grep SwapFree /proc/meminfo | awk '{print $2}'") or "0")
    swap_used_kb = max(0, swap_total_kb - swap_free_kb)

    df = (run("df -B1 / | tail -1") or "").split()
    disk_total = int(df[1]) if len(df) > 1 else 0
    disk_used = int(df[2]) if len(df) > 2 else 0
    disk_pct = int(df[4].rstrip("%")) if len(df) > 4 else 0

    ts_ip = run("tailscale ip -4 2>/dev/null") or run("/usr/bin/tailscale ip -4 2>/dev/null")

    cpu_temp = read_cpu_temp_mint() if flavor == "mint" else read_cpu_temp_pi()
    cpu_count = int(run("nproc") or "1")
    process_count = int(run("ps -e --no-headers 2>/dev/null | wc -l") or "0")
    repos, mirror_last = mirror_meta()

    return {
        "hostname": hostname,
        "uptimeSec": uptime_s,
        "load1": float(load_1),
        "load5": float(load_5),
        "load15": float(load_15),
        "memTotalMb": round(mem_total_kb / 1024),
        "memUsedMb": round(mem_used_kb / 1024),
        "memUsedPct": round(100 * mem_used_kb / mem_total_kb) if mem_total_kb else 0,
        "swapTotalMb": round(swap_total_kb / 1024),
        "swapUsedMb": round(swap_used_kb / 1024),
        "swapUsedPct": round(100 * swap_used_kb / swap_total_kb) if swap_total_kb else 0,
        "diskTotalGb": round(disk_total / 1e9, 1),
        "diskUsedGb": round(disk_used / 1e9, 1),
        "diskUsedPct": disk_pct,
        "cpuCount": cpu_count,
        "processCount": process_count,
        "tailscaleIp": ts_ip or None,
        "mirrorRepoCount": repos,
        "mirrorLastLog": mirror_last,
        "cpuTempC": cpu_temp,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("flavor", choices=("mint", "pi"))
    parser.add_argument(
        "--sample-only",
        action="store_true",
        help="Append a trend sample only (for systemd timer); no JSON on stdout",
    )
    args = parser.parse_args()

    path = history_path()
    metrics = collect(args.flavor)
    samples = append_sample(metrics, path)
    if args.sample_only:
        return 0

    out = {**metrics, "trend": samples_to_trend(samples)}
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
