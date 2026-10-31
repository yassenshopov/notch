from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.config import AgentConfig
from agent.engine import SensorEngine
from api.routes import create_router


def build_app(config: AgentConfig | None = None) -> FastAPI:
    cfg = config or AgentConfig.from_env()
    engine = SensorEngine(cfg)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await engine.start()
        app.state.engine = engine
        yield
        await engine.stop()

    app = FastAPI(title="Wi-Fi Sense Agent", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(create_router(engine, cfg.auth_token))
    return app
