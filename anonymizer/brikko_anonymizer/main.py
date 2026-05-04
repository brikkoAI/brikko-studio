"""Brikko Anonymizer FastAPI app (M1 task 12+).

Lifespan-managed singletons:

* :class:`DegradedWatcher` polling CPU/RAM in a daemon thread.
* :class:`Pipeline` (workspace-store cache + audit + policy dispatch).
* Tool policies loaded from ``BRIKKO_TOOL_POLICIES_PATH`` (defaults to the
  bundled ``default_tool_policies.yaml``).

Both are stashed on ``app.state`` so the per-request handlers in
:mod:`brikko_anonymizer.api` can resolve them with no globals.

``/health`` stays as the M0 liveness probe (docker-compose / CI use it).
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from brikko_anonymizer import audit_log, policy
from brikko_anonymizer.api import router as api_router
from brikko_anonymizer.degraded_mode import DegradedWatcher
from brikko_anonymizer.pipeline import Pipeline
from brikko_anonymizer.version import __version__


def _load_tool_policies() -> policy.ToolPolicies:
    """Resolve and load the tool-call policy YAML.

    Operators may override the bundled default by setting
    ``BRIKKO_TOOL_POLICIES_PATH`` to a custom file; if the override path
    does not exist we fall back to the empty-defaults registry rather than
    crashing the boot.
    """
    override = os.environ.get("BRIKKO_TOOL_POLICIES_PATH")
    if override:
        p = Path(override)
    else:
        p = Path(__file__).parent / "default_tool_policies.yaml"
    if p.exists():
        return policy.ToolPolicies.load(p)
    return policy.ToolPolicies.default()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Background CPU/RAM watcher.
    watcher = DegradedWatcher()
    watcher.start()

    # 2. Tool policies (read once at boot).
    tool_policies = _load_tool_policies()

    # 3. Pipeline owns the per-workspace MappingStore cache.
    pipeline = Pipeline(
        degraded_mode_provider=watcher.current,
        tool_policies=tool_policies,
    )

    # 4. One-shot audit retention sweep at boot. The daily sweep is M3
    # follow-up via apscheduler — for M1 the boot sweep keeps disk
    # bounded across restarts (operators often restart daily).
    try:
        audit_log.run_retention()
    except Exception:  # noqa: BLE001 - retention failure must not block boot
        pass

    app.state.watcher = watcher
    app.state.pipeline = pipeline
    app.state.tool_policies = tool_policies

    try:
        yield
    finally:
        try:
            watcher.stop()
        finally:
            pipeline.close()


app = FastAPI(
    title="Brikko Anonymizer",
    version=__version__,
    description="On-prem PII sidecar — /anonymize, /restore, tool-call gating.",
    lifespan=lifespan,
)


class HealthResponse(BaseModel):
    status: str
    version: str
    degraded_mode: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness/readiness probe used by docker-compose healthcheck and CI."""
    mode = "full"
    watcher = getattr(app.state, "watcher", None)
    if watcher is not None:
        try:
            mode = watcher.current()
        except Exception:  # noqa: BLE001 — defensive, never break the probe
            mode = "unknown"
    return HealthResponse(status="ok", version=__version__, degraded_mode=mode)


app.include_router(api_router)
