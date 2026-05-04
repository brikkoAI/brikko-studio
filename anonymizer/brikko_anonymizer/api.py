"""FastAPI router for the Brikko Anonymizer HTTP API (M1 Tasks 12-15).

All endpoints share the singleton :class:`Pipeline` + :class:`DegradedWatcher`
that ``main.py`` builds in its lifespan and stashes on ``app.state``. Handlers
pull them via the two private helpers :func:`_pipeline` / :func:`_watcher`,
which both raise a 503 if the lifespan has not been entered (defensive — the
test conftest manually populates ``app.state``).
"""
from __future__ import annotations

import json
from typing import AsyncIterator, Callable, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from . import schemas
from .errors import (
    KeyringUnavailableError,
    MappingDecryptError,
    StreamProtocolError,
    TrustViolationError,
    WorkspaceKeyMissingError,
)
from .mapping_store import MappingStore
from .pii.masker import PiiMapping
from .pii.streaming import StreamUnmasker
from .pipeline import Pipeline


router = APIRouter()


# ----------------------------------------------------- StreamUnmasker adapter
#
# StreamUnmasker takes a fully-materialised PiiMapping (with .reverse dict).
# For /restore_stream we want lazy lookup against the encrypted SQLite store
# instead — placeholders may be hundreds, only a handful appear in any
# given stream. LookupReverse is a tiny dict-shaped adapter whose .get()
# delegates to the per-workspace store and tracks every miss so the caller
# can emit the hallucinated set in the terminal end event.
#
# Hard Constraint 1 from the M1 plan: pii/streaming.py is a byte-copy from
# the Gateway and must not be modified. The adapter avoids touching it.
# Upstream enhancement (StreamUnmasker accepts a callable directly) is
# tracked as an M3 follow-up.


class _LookupReverse:
    """Dict-shaped adapter: ``.get(ph, default)`` delegates to a lookup callable.

    Records every placeholder for which the lookup returned ``None`` so the
    HTTP layer can surface the hallucinated set on stream close.
    """

    __slots__ = ("_lookup", "hallucinated")

    def __init__(self, lookup: Callable[[str], Optional[str]]) -> None:
        self._lookup = lookup
        self.hallucinated: set[str] = set()

    def get(self, key: str, default=None):
        val = self._lookup(key)
        if val is None:
            # Only count *placeholder-shaped* misses — the unmask regex
            # only feeds us strings matching <TYPE_DIGITS>, so every miss
            # here really is a hallucinated placeholder.
            self.hallucinated.add(key)
            return default
        return val


def _lookup_backed_mapping(
    lookup: Callable[[str], Optional[str]]
) -> tuple[PiiMapping, _LookupReverse]:
    """Build a ``PiiMapping`` whose ``.reverse`` defers to ``lookup``.

    ``PiiMapping.is_empty`` returns ``not self.reverse``. For a class
    instance with neither ``__bool__`` nor ``__len__``, ``bool(instance)``
    is True — so swapping ``.reverse`` for our adapter keeps
    ``is_empty()`` False without any seed entries.
    """
    rev = _LookupReverse(lookup)
    mapping = PiiMapping()
    mapping.reverse = rev  # type: ignore[assignment]
    return mapping, rev


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


# ------------------------------------------------- /tool_call/deanonymize


@router.post(
    "/tool_call/deanonymize",
    response_model=schemas.ToolCallDeanonResponse,
)
async def tool_call_deanonymize(
    payload: schemas.ToolCallDeanonRequest, request: Request
) -> schemas.ToolCallDeanonResponse:
    """Replace placeholders in tool args according to the tool policy.

    Loads the per-tool policy from ``app.state.pipeline._tool_policies``
    (initialised in main.lifespan from BRIKKO_TOOL_POLICIES_PATH or the
    bundled ``default_tool_policies.yaml``). The optional
    ``payload.policy`` overrides the loaded policy for this single call —
    useful for pinning ``forbid`` from a higher-level guardrail.
    """
    pipe = _pipeline(request)
    try:
        args, keys = pipe.deanonymize_tool_args(
            payload.workspace_id,
            tool_name=payload.tool_name,
            args=payload.args,
            policy_override=payload.policy,
            request_id=payload.request_id,
        )
    except TrustViolationError as exc:
        raise HTTPException(
            status_code=403,
            detail={"error": "trust_violation", "message": str(exc)},
        ) from exc
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

    return schemas.ToolCallDeanonResponse(
        args=args,
        deanonymized_keys=keys,
        request_id=payload.request_id,
    )


# ---------------------------------------------------------- /restore_stream


def _ndjson_lines(body: bytes) -> list[str]:
    """Decode + split a raw NDJSON request body, dropping blank lines."""
    text = body.decode("utf-8")
    return [ln for ln in text.split("\n") if ln.strip()]


@router.post("/restore_stream")
async def restore_stream(request: Request) -> StreamingResponse:
    """Streaming restore endpoint (NDJSON in, NDJSON out).

    Request body framing::

        {"workspace_id": "ws_x", "request_id": "r1"}
        {"type": "chunk", "text": "..."}
        {"type": "chunk", "text": "..."}
        {"type": "end"}

    Response framing (one JSON object per line, ``\\n``-terminated)::

        {"type": "chunk", "text": "..."}
        {"type": "end", "hallucinated": ["<NAME_999>", ...]}

    Notes:
    * The request body is buffered (FastAPI default). True request-side
      streaming would require ``request.stream()`` and is deferred to M2.
    * EOF without an explicit ``end`` event still produces a clean
      terminal ``end`` event so consumers always see one.
    """
    pipe = _pipeline(request)

    raw = await request.body()
    lines = _ndjson_lines(raw)
    if not lines:
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": "empty request body"},
        )

    # Header line — required keys.
    try:
        header = json.loads(lines[0])
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": f"header not JSON: {exc}"},
        ) from exc
    if not isinstance(header, dict) or "workspace_id" not in header or "request_id" not in header:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "bad_request",
                "message": "header must include workspace_id and request_id",
            },
        )
    workspace_id = header["workspace_id"]

    # Resolve the per-workspace store + build the lazy lookup.
    try:
        store: MappingStore = pipe._store(workspace_id)
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

    def _lookup(placeholder: str) -> Optional[str]:
        try:
            return store.get(placeholder)
        except MappingDecryptError:
            # Treat unreadable rows as missing — the stream stays alive
            # and the placeholder surfaces in the hallucinated set.
            return None

    mapping, reverse = _lookup_backed_mapping(_lookup)
    unmasker = StreamUnmasker(mapping=mapping)

    async def _gen() -> AsyncIterator[bytes]:
        try:
            for line in lines[1:]:
                try:
                    evt = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise StreamProtocolError(
                        f"event not JSON: {exc}"
                    ) from exc
                if not isinstance(evt, dict):
                    raise StreamProtocolError("event must be a JSON object")
                etype = evt.get("type")
                if etype == "chunk":
                    out = unmasker.feed(evt.get("text") or "")
                    if out:
                        yield (
                            json.dumps(
                                {"type": "chunk", "text": out},
                                ensure_ascii=False,
                            )
                            + "\n"
                        ).encode("utf-8")
                elif etype == "end":
                    break
                else:
                    raise StreamProtocolError(
                        f"unknown event type: {etype!r}"
                    )

            tail = unmasker.flush()
            if tail:
                yield (
                    json.dumps(
                        {"type": "chunk", "text": tail}, ensure_ascii=False
                    )
                    + "\n"
                ).encode("utf-8")
            yield (
                json.dumps(
                    {
                        "type": "end",
                        "hallucinated": sorted(reverse.hallucinated),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            ).encode("utf-8")
        except StreamProtocolError as exc:
            # Inline error event — once we've started streaming we can't
            # change the HTTP status code, so the protocol surfaces the
            # error as a terminal NDJSON line the client must check for.
            yield (
                json.dumps(
                    {"type": "error", "error": "stream_protocol", "message": str(exc)},
                    ensure_ascii=False,
                )
                + "\n"
            ).encode("utf-8")

    return StreamingResponse(_gen(), media_type="application/x-ndjson")


__all__ = ["router"]
