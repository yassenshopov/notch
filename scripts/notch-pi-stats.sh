#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
import json, subprocess
from pathlib import Path

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""

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

cpu_temp = None
vc = run("vcgencmd measure_temp 2>/dev/null")
if vc and "=" in vc:
    try:
        cpu_temp = float(vc.split("=")[1].strip().rstrip("'C"))
    except ValueError:
        pass
if cpu_temp is None:
    raw = run("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null")
    if raw.isdigit():
        cpu_temp = round(int(raw) / 1000, 1)

cpu_count = int(run("nproc") or "1")
process_count = int(run("ps -e --no-headers 2>/dev/null | wc -l") or "0")

root = Path.home() / "github-mirror"
repos = len(list(root.glob("*/*.git"))) if root.is_dir() else 0
mirror_last = ""
log = root / "sync.log"
if log.is_file():
    for line in reversed(log.read_text(errors="replace").splitlines()[-40:]):
        if "sync done" in line or "sync start" in line:
            mirror_last = line[:25]
            break

print(json.dumps({
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
    "mirrorLastLog": mirror_last or None,
    "cpuTempC": cpu_temp,
}))
PY
