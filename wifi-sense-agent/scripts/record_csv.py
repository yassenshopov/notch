#!/usr/bin/env python3
"""Record managed-mode Wi-Fi metrics to CSV (Stage 2 validation)."""
from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from collector.managed_iwl import collect_station, primary_metric  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Record Wi-Fi link metrics to CSV")
    parser.add_argument("--iface", default="wlp1s0")
    parser.add_argument("--seconds", type=float, default=30.0)
    parser.add_argument("--hz", type=float, default=8.0)
    parser.add_argument("--out", type=Path, default=Path("wifi-sense-sample.csv"))
    args = parser.parse_args()

    interval = 1.0 / max(args.hz, 0.5)
    end = time.time() + args.seconds
    rows: list[dict] = []

    print(f"Recording {args.seconds}s at {args.hz} Hz on {args.iface} → {args.out}")
    while time.time() < end:
        sample = collect_station(args.iface)
        if sample is not None:
            metric = primary_metric(sample)
            rows.append(
                {
                    "ts": sample.ts,
                    "metric_dbm": metric,
                    "signal_dbm": sample.signal_dbm,
                    "beacon_avg_dbm": sample.beacon_signal_avg_dbm,
                    "rx_packets": sample.rx_packets,
                }
            )
        time.sleep(interval)

    if not rows:
        print("No samples collected — is the interface connected?", file=sys.stderr)
        return 1

    with args.out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    metrics = [r["metric_dbm"] for r in rows if r["metric_dbm"] is not None]
    spread = max(metrics) - min(metrics) if metrics else 0.0
    print(f"Samples: {len(rows)}, metric spread: {spread:.2f} dB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
