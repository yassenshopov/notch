from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class AgentConfig:
    bind_host: str
    port: int
    iface: str
    poll_hz: float
    auth_token: str | None
    demo_mode: bool
    db_path: str
    stale_after_sec: float
    raw_retention_days: int

    @staticmethod
    def from_env() -> "AgentConfig":
        bind = os.environ.get("WIFI_SENSE_BIND", "127.0.0.1").strip() or "127.0.0.1"
        return AgentConfig(
            bind_host=bind,
            port=int(os.environ.get("WIFI_SENSE_PORT", "8765")),
            iface=os.environ.get("WIFI_SENSE_IFACE", "wlp1s0").strip() or "wlp1s0",
            poll_hz=min(10.0, max(0.5, float(os.environ.get("WIFI_SENSE_POLL_HZ", "8")))),
            auth_token=(os.environ.get("WIFI_SENSE_TOKEN") or "").strip() or None,
            demo_mode=_env_bool("WIFI_SENSE_DEMO", False),
            db_path=os.environ.get(
                "WIFI_SENSE_DB",
                os.path.expanduser("~/.local/share/wifi-sense-agent/history.db"),
            ),
            stale_after_sec=float(os.environ.get("WIFI_SENSE_STALE_SEC", "5")),
            raw_retention_days=int(os.environ.get("WIFI_SENSE_RETENTION_DAYS", "7")),
        )
