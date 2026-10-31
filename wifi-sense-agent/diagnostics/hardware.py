from __future__ import annotations

import glob
import os
import subprocess


def read_hardware_snapshot(iface: str) -> dict:
    pci = _run("lspci -nnk | grep -iA3 'Network controller'")
    driver = _driver_for_iface(iface)
    modinfo = _run(f"modinfo {driver} 2>/dev/null | head -8") if driver else ""
    link = _run(f"iw dev {iface} link 2>/dev/null")
    return {
        "iface": iface,
        "pci": pci.strip(),
        "driver": driver,
        "modinfo": modinfo.strip(),
        "link": link.strip(),
        "csi": "unsupported",
        "mode": "managed_rssi",
        "chipset_note": "Intel AC 8265 — no per-subcarrier CSI on stock iwlwifi",
    }


def _run(cmd: str) -> str:
    try:
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=3.0)
        return proc.stdout or proc.stderr or ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def _driver_for_iface(iface: str) -> str | None:
    path = f"/sys/class/net/{iface}/device/driver"
    try:
        target = os.readlink(path)
        return os.path.basename(target)
    except OSError:
        return None


def detect_tailscale_ip() -> str | None:
    try:
        proc = subprocess.run(
            ["tailscale", "ip", "-4"],
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
        line = (proc.stdout or "").strip().splitlines()
        return line[0].strip() if line else None
    except (OSError, subprocess.TimeoutExpired):
        return None
