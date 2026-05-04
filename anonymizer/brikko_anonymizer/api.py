"""FastAPI router for the Brikko Anonymizer HTTP API (M1 Tasks 12-15).

All endpoints share the singleton :class:`Pipeline` + :class:`DegradedWatcher`
that ``main.py`` builds in its lifespan and stashes on ``app.state``. Handlers
pull them via the two private helpers :func:`_pipeline` / :func:`_watcher`,
which both raise a 503 if the lifespan has not been entered (defensive — the
test conftest manually populates ``app.state``).
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from . import schemas
from .errors import (
    KeyringUnavailableError,
    TrustViolationError,
    WorkspaceKeyMissingError,
)
from .pipeline import Pipeline


router = APIRouter()


# ---------------------------------------------------------------- helpers


def _pipeline(request: Request) -> Pipeline:
    pipe = getattr(request.app.state, "pipeline", None)
    if pipe is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "not_ready", "message": "pipeline not initialised"},
        )
    return pipe


def _watcher(request: Request):
    w = getattr(request.app.state, "watcher", None)
    if w is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "not_ready", "message": "watcher not initialised"},
        )
    return w


# ---------------------------------------------------------------- /anonymize


@router.post("/anonymize", response_model=schemas.AnonymizeResponse)
async def anonymize(
    payload: schemas.AnonymizeRequest, request: Request
) -> schemas.AnonymizeResponse:
    pipe = _pipeline(request)
    try:
        result = pipe.anonymize(
            payload.workspace_id,
            text=payload.text,
            policy_profile=payload.policy_profile,
            session_id=payload.session_id,
            request_id=payload.request_id,
        )
    except (KeyringUnavailableError, WorkspaceKeyMissingError) as exc:
        raise HTTPException(
            status_code=503,
            detail={"error": "key_unavailable", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        # paths.workspace_dir raises ValueError on dot-slash workspace_id —
        # that's a user input error, not a server bug.
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": str(exc)},
        ) from exc

    return schemas.AnonymizeResponse(
        masked_text=result.masked_text,
        entities=[
            schemas.Entity(
                placeholder=e.placeholder,
                category=e.category,
                confidence=e.confidence,
            )
            for e in result.entities
        ],
        request_id=payload.request_id,
        degraded_mode=result.degraded_mode,
        latency_ms=result.latency_ms,
    )


# ---------------------------------------------------------------- /restore


@router.post("/restore", response_model=schemas.RestoreResponse)
async def restore(
    payload: schemas.RestoreRequest, request: Request
) -> schemas.RestoreResponse:
    pipe = _pipeline(request)
    try:
        result = pipe.restore(
            payload.workspace_id,
            text=payload.text,
            request_id=payload.request_id,
        )
    except (KeyringUnavailableError, WorkspaceKeyMissingError) as exc:
        raise HTTPException(
            status_code=503,
            detail={"error": "key_unavailable", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": str(exc)},
        ) from exc

    return schemas.RestoreResponse(
        restored_text=result.restored_text,
        hallucinated=result.hallucinated,
        request_id=payload.request_id,
        latency_ms=result.latency_ms,
    )


__all__ = ["router"]
