#!/usr/bin/env python3
from __future__ import annotations

import uvicorn

from agent.config import AgentConfig
from api.app import build_app


def main() -> None:
    config = AgentConfig.from_env()
    app = build_app(config)
    uvicorn.run(
        app,
        host=config.bind_host,
        port=config.port,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
