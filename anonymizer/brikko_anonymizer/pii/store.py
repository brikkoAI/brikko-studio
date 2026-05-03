# mypy: disable-error-code="union-attr,misc"
# Reason: redis-py's async stubs return ``Awaitable[T] | T`` from many methods
# because the same surface is shared with sync clients. Our usage is always
# async (``await``) so the union is bogus at runtime; suppressing locally
# instead of casting at every call site keeps the code readable.

"""Redis store for per-request PII mapping (Sprint 4 Поток M).

Lifecycle:

    1. ``mask_messages`` produces ``PiiMapping(forward, reverse, ...)``.
    2. ``PiiMappingStore.save(request_id, mapping, ttl=3600)`` persists the
       reverse map as a Redis HSET with TTL — so even if the gateway
       crashes mid-call, the mapping evaporates within the hour and we
       don't accumulate stale plaintext PII in Redis.
    3. After the provider response lands, ``load(request_id)`` recovers
       the mapping and ``unmask_text`` restores originals.

Key shape: ``pii:map:{request_id}`` → HSET of ``placeholder → original``.

Failure-mode (Redis down):

    save() returns silently — masking still works (placeholders go to the
    provider) but unmask becomes a no-op when ``load()`` returns an empty
    mapping. The user sees ``<NAME_1>`` etc. in the response — degraded
    UX, NOT a leaked PII. Compliance posture intact.

This is an intentional choice: prefer "user sees a placeholder" over
"PII slips through because Redis hiccup'ed at the wrong moment".
"""

from __future__ import annotations

from redis.asyncio import Redis

from brikko_anonymizer.pii.masker import PiiMapping

# M1: Gateway used a structlog wrapper at voltari_gateway.utils.logging.get_logger
# whose BoundLogger accepts kwargs (log.warning("name", request_id=..., size=...)).
# In the standalone anonymizer package we don't carry the structlog wiring; use a
# stdlib LoggerAdapter that swallows extra kwargs so the existing call sites
# (log.warning("event", k=v)) continue to work without any code changes below.
import logging as _stdlib_logging


class _KwargCompatLogger(_stdlib_logging.LoggerAdapter):  # type: ignore[type-arg]
    """LoggerAdapter that accepts arbitrary keyword args (structlog-style)."""

    def process(self, msg, kwargs):  # type: ignore[override]
        # stdlib LoggerAdapter expects only `extra` / `exc_info` / `stack_info`
        # / `stacklevel` in kwargs. Pull out the structlog-style fields and
        # stuff them into `extra` so they appear on the LogRecord.
        reserved = {"exc_info", "stack_info", "stacklevel", "extra"}
        extra = kwargs.pop("extra", {}) or {}
        for k in list(kwargs.keys()):
            if k not in reserved:
                extra[k] = kwargs.pop(k)
        if extra:
            kwargs["extra"] = extra
        return msg, kwargs


def get_logger(name: str | None = None) -> _KwargCompatLogger:
    return _KwargCompatLogger(_stdlib_logging.getLogger(name), {})


log = get_logger(__name__)


_KEY_PREFIX = "pii:map:"
DEFAULT_TTL_SECONDS = 3600  # 1 hour — covers slow-stream / retry windows.


class PiiMappingStore:
    """Thin Redis wrapper for PII mapping lifecycle.

    Stateless — every method takes a Redis client (or a None for "store
    disabled"). We don't hold a reference because the gateway already
    manages the Redis client lifecycle in ``main.lifespan``.
    """

    def __init__(self, redis: Redis | None) -> None:
        self._redis = redis

    @property
    def enabled(self) -> bool:
        """True iff a working Redis client is wired in."""
        return self._redis is not None

    @staticmethod
    def _key(request_id: str) -> str:
        return f"{_KEY_PREFIX}{request_id}"

    async def save(
        self,
        request_id: str,
        mapping: PiiMapping,
        *,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> bool:
        """Persist mapping; return True on success, False on Redis-down or empty.

        Empty mapping → no-op (don't waste a Redis round-trip on a request
        with no PII).
        """
        if mapping.is_empty():
            return False
        if self._redis is None:
            log.warning(
                "pii_store_save_no_redis",
                request_id=request_id,
                size=mapping.size,
            )
            return False
        try:
            key = self._key(request_id)
            payload = mapping.to_redis_dict()
            # HSET + EXPIRE in a pipeline — atomic per Redis semantics.
            async with self._redis.pipeline(transaction=True) as pipe:
                # mypy: the redis-py async typings on hset accept str→str
                # mappings via ``mapping=`` keyword. We pass it that way.
                await pipe.hset(key, mapping=payload).expire(key, ttl_seconds).execute()
            return True
        except Exception as exc:
            # Don't bubble — masking is best-effort by design.
            log.warning(
                "pii_store_save_failed",
                request_id=request_id,
                error=str(exc),
            )
            return False

    async def load(self, request_id: str) -> PiiMapping:
        """Read back the mapping; empty PiiMapping on miss / Redis down."""
        if self._redis is None:
            return PiiMapping()
        try:
            key = self._key(request_id)
            data = await self._redis.hgetall(key)
        except Exception as exc:
            log.warning(
                "pii_store_load_failed",
                request_id=request_id,
                error=str(exc),
            )
            return PiiMapping()
        if not data:
            return PiiMapping()
        # Redis with decode_responses=True returns str→str. Without, bytes.
        # Normalise to str so downstream code doesn't have to care.
        decoded: dict[str, str] = {}
        for k, v in data.items():
            sk = k.decode("utf-8") if isinstance(k, bytes) else k
            sv = v.decode("utf-8") if isinstance(v, bytes) else v
            decoded[sk] = sv
        return PiiMapping.from_redis_dict(decoded)

    async def delete(self, request_id: str) -> None:
        """Best-effort delete after unmask — frees Redis slot earlier than TTL."""
        if self._redis is None:
            return
        try:
            await self._redis.delete(self._key(request_id))
        except Exception as exc:
            log.warning(
                "pii_store_delete_failed",
                request_id=request_id,
                error=str(exc),
            )


__all__ = ["DEFAULT_TTL_SECONDS", "PiiMappingStore"]
