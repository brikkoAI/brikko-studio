"""Cross-endpoint PII integration helpers (Sprint 13 / Privacy v2 — Phase 4).

Single source of truth for the gate logic and unmask plumbing that several
endpoints (``/v1/chat/completions``, ``/v1/messages``, ``/v1/embeddings``,
``/v1/audio/transcriptions``) all share. Until Phase 4 these functions
lived inside ``api/chat.py`` as module-private helpers; the additional
endpoints would have to copy-paste them or reach across into another
module's private API. Lifting them here keeps the contract explicit and
the test surface flat.

The functions are pure: no DB writes, no Redis writes, no HTTP. Their
callers wire them into the request lifecycle, choose when to persist the
mapping into Redis, and surface audit logs.

Public API
----------

* :func:`resolve_account_pii_flag` — read ``Account.pii_masking_enabled``
  with the auth-cache short-circuit.
* :func:`compute_pii_flags` — combine the three opt-in signals into a
  single bool. Two flavours:

    - ``compute_pii_flags(...)`` — the chat / messages / audio gate
      (account flag *or* header *or* body flag).
    - :func:`compute_pii_flags_optin_only` — the embeddings gate
      (header *or* body flag, account flag deliberately ignored).

* :func:`unmask_payload_openai` — walk an OpenAI-shape JSON response and
  unmask in place. Verbatim move of ``chat.py`` helper.
* :func:`unmask_payload_anthropic` — walk an Anthropic-shape Messages
  response (``content[].text`` blocks + ``tool_use.input``).
* :func:`stream_unmask_chunk_openai` — OpenAI ``delta.content`` pipe.
* :func:`stream_unmask_anthropic_event` — Anthropic
  ``content_block_delta.delta.text`` pipe.

The functions don't import FastAPI / SQLAlchemy at module top level beyond
what they actually need — ``resolve_account_pii_flag`` is the only one
that touches the DB.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

# M1: ``Account`` is a Gateway-side SQLAlchemy model that lives in
# ``voltari_gateway.db.models``. The standalone anonymizer doesn't ship the DB
# layer, so we cannot import it eagerly. Only ``resolve_account_pii_flag`` uses
# it; the import is deferred to inside the function so the module loads cleanly
# in environments without the Gateway package installed. Callers in standalone
# mode are expected to pass ``cached=...`` (the fast path), which never hits
# the DB at all.
from brikko_anonymizer.pii.masker import PiiMapping, unmask_text
from brikko_anonymizer.pii.streaming import StreamUnmasker

__all__ = [
    "compute_pii_flags",
    "compute_pii_flags_optin_only",
    "header_flag_truthy",
    "resolve_account_pii_flag",
    "stream_unmask_anthropic_event",
    "stream_unmask_chunk_openai",
    "unmask_payload_anthropic",
    "unmask_payload_openai",
]


# Header values that count as "on". Mirrors the original chat.py block —
# canonical (1/true/yes/on) plus any case folding the caller might have
# already done.
_TRUTHY_HEADER_VALUES = frozenset({"1", "true", "yes", "on"})


def header_flag_truthy(header_value: str | None) -> bool:
    """``True`` iff ``X-PII-Protect`` (or analog) is one of the truthy values.

    Trims whitespace and lower-cases first. ``None`` / empty / "false" /
    any other string returns ``False``. Pure helper exposed because tests
    and several handlers share the rule.
    """
    if header_value is None:
        return False
    return header_value.strip().lower() in _TRUTHY_HEADER_VALUES


async def resolve_account_pii_flag(
    db: AsyncSession,
    account_id: uuid.UUID,
    *,
    cached: bool | None = None,
) -> bool:
    """Look up ``Account.pii_masking_enabled`` for the request's account.

    Sprint 5 perf: the auth principal carries ``pii_masking_enabled``
    (TTL 60s through the Redis auth cache). Callers pass that as ``cached``
    to avoid a per-request SELECT. The DB fallback path stays for the rare
    case the principal didn't have the field (legacy cache entries from
    before the cache-key bump).
    """
    if cached is not None:
        return cached
    # Lazy import: only required when the Gateway is installed alongside the
    # anonymizer (in-process integration). Standalone deployments never reach
    # this branch because they always pass ``cached=...``.
    from voltari_gateway.db.models import Account  # type: ignore[import-not-found]

    account = await db.get(Account, account_id)
    if account is None:
        return False
    return bool(account.pii_masking_enabled)


def compute_pii_flags(
    *,
    header_value: str | None,
    body_flag: bool | None,
    account_flag: bool,
) -> bool:
    """Three-way gate (chat / messages / audio): any → enabled.

    1. ``Account.pii_masking_enabled`` (tariff Pro Privacy / Enterprise).
    2. ``X-PII-Protect`` header truthy.
    3. Body field ``pii_protect: true``.

    The account flag is the strongest commit ("always mask"); per-request
    flags allow opt-in for default tariffs without touching account state.
    """
    return (
        bool(account_flag)
        or header_flag_truthy(header_value)
        or bool(body_flag)
    )


def compute_pii_flags_optin_only(
    *,
    header_value: str | None,
    body_flag: bool | None,
) -> bool:
    """Embeddings gate — opt-in ONLY through header / body field.

    Account-level ``pii_masking_enabled`` is **deliberately ignored**:
    masking changes the embedding vector by design (replacing «Иванов»
    with ``<NAME_1>`` produces a different vector). Auto-enabling for
    ``PRO_PRIVACY`` accounts would silently break their RAG pipelines.
    Customers who want PII protection on embeddings request it explicitly
    per-call.
    """
    return header_flag_truthy(header_value) or bool(body_flag)


def unmask_payload_openai(payload: dict[str, Any], mapping: PiiMapping) -> None:
    """Walk a non-streaming OpenAI response and unmask any text we find.

    Mutates ``payload`` in place. Handles:

    * ``choices[].message.content`` — string OR list of content blocks.
    * ``choices[].delta.content`` — same shape on streaming chunks (caller
      passes one parsed chunk at a time).
    * ``choices[].message.tool_calls[].function.arguments`` — JSON string.

    Anything else is left untouched. No-op if mapping is empty.
    """
    if mapping.is_empty():
        return
    choices = payload.get("choices")
    if not isinstance(choices, list):
        return
    for ch in choices:
        if not isinstance(ch, dict):
            continue
        for slot in ("message", "delta"):
            msg = ch.get(slot)
            if not isinstance(msg, dict):
                continue
            content = msg.get("content")
            if isinstance(content, str):
                msg["content"] = unmask_text(content, mapping)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and isinstance(block.get("text"), str):
                        block["text"] = unmask_text(block["text"], mapping)
            tool_calls = msg.get("tool_calls")
            if isinstance(tool_calls, list):
                for tc in tool_calls:
                    if not isinstance(tc, dict):
                        continue
                    fn = tc.get("function")
                    if isinstance(fn, dict) and isinstance(fn.get("arguments"), str):
                        fn["arguments"] = unmask_text(fn["arguments"], mapping)


def unmask_payload_anthropic(payload: dict[str, Any], mapping: PiiMapping) -> None:
    """Walk an Anthropic Messages response and unmask any text we find.

    Mutates ``payload`` in place. Anthropic shape:

    * ``content`` is a list of blocks: ``{"type": "text", "text": "..."}``
      or ``{"type": "tool_use", "id": ..., "name": ..., "input": {...}}``.
    * Top-level ``role`` / ``stop_reason`` / ``usage`` carry no text.

    Tool-use ``input`` may contain PII inside JSON-string fields. We walk
    string leaves recursively so a deep-nested ``{"address": "<NAME_1>"}``
    is also restored. Non-string scalars are left as-is.
    """
    if mapping.is_empty():
        return
    content = payload.get("content")
    if not isinstance(content, list):
        return
    for block in content:
        if not isinstance(block, dict):
            continue
        # Text block — direct unmask of the surface text.
        if isinstance(block.get("text"), str):
            block["text"] = unmask_text(block["text"], mapping)
        # tool_use input — walk string leaves only.
        if block.get("type") == "tool_use":
            inp = block.get("input")
            if inp is not None:
                block["input"] = _unmask_json_strings(inp, mapping)


def _unmask_json_strings(value: Any, mapping: PiiMapping) -> Any:
    """Recursively replace placeholders inside string leaves of ``value``.

    Handles dict / list / str. Anything else passes through. Used by the
    Anthropic unmask path on ``tool_use.input`` and is general enough to
    re-use for other JSON-tree unmask needs.
    """
    if isinstance(value, str):
        return unmask_text(value, mapping)
    if isinstance(value, dict):
        return {k: _unmask_json_strings(v, mapping) for k, v in value.items()}
    if isinstance(value, list):
        return [_unmask_json_strings(v, mapping) for v in value]
    return value


def stream_unmask_chunk_openai(
    payload: dict[str, Any], unmasker: StreamUnmasker
) -> None:
    """Pipe ``choices[].delta.content`` strings through ``StreamUnmasker``.

    Mutates ``payload`` in place: each content string field is replaced
    with what the unmasker is willing to emit so far (plus any deferred
    bytes from previous chunks). Holds back the 32-byte tail until the
    next chunk arrives — see :class:`StreamUnmasker`.

    Only handles the **delta** slot (streaming). ``message.content`` and
    ``tool_calls[].function.arguments`` are still routed through
    :func:`unmask_payload_openai` afterwards.
    """
    choices = payload.get("choices")
    if not isinstance(choices, list):
        return
    for ch in choices:
        if not isinstance(ch, dict):
            continue
        delta = ch.get("delta")
        if not isinstance(delta, dict):
            continue
        content = delta.get("content")
        if isinstance(content, str):
            delta["content"] = unmasker.feed(content)


def stream_unmask_anthropic_event(
    payload: dict[str, Any], unmasker: StreamUnmasker
) -> None:
    """Pipe Anthropic SSE event text through ``StreamUnmasker``.

    Mutates ``payload`` in place. Handled event types:

    * ``content_block_delta`` — incremental text in ``delta.text``
      (``type: "text_delta"``). The hot path — most assistant output
      arrives this way and the carry-buffer protects against placeholder
      tokens being split across SSE chunks.
    * ``content_block_start`` — initial seed text in
      ``content_block.text`` (rare; some Anthropic SDK versions emit a
      non-empty seed when retrying from cache).
    * ``content_block_stop`` — when an SDK accumulates blocks (Anthropic
      Python SDK ``stream.parse``), this event carries the **full
      block text** alongside the stop marker. Without this branch the
      assembled text leaks the placeholder past us.

    Other event types (``message_start``/``message_delta``/
    ``message_stop``/``ping``/``error``) carry no user-visible text and
    are left alone.

    Note: ``content_block_stop`` is handled with a one-shot
    :func:`unmask_text` call rather than ``unmasker.feed`` because the
    accumulated text is the whole block — it's not "streaming" in the
    sense of "more chunks coming for this slot". Mixing the two would
    double-emit the carry buffer; we use the unmasker's underlying
    mapping directly instead.
    """
    ev_type = payload.get("type")
    if ev_type == "content_block_delta":
        delta = payload.get("delta")
        if isinstance(delta, dict):
            text = delta.get("text")
            if isinstance(text, str):
                delta["text"] = unmasker.feed(text)
    elif ev_type == "content_block_start":
        block = payload.get("content_block")
        if isinstance(block, dict):
            text = block.get("text")
            if isinstance(text, str) and text:
                block["text"] = unmasker.feed(text)
    elif ev_type == "content_block_stop":
        # SDK-accumulated full-block text. One-shot unmask via the
        # mapping (no carry buffer — the whole text is here).
        block = payload.get("content_block")
        if isinstance(block, dict):
            text = block.get("text")
            if isinstance(text, str) and text:
                block["text"] = unmask_text(text, unmasker.mapping)
    elif ev_type == "text":
        # Anthropic SDK synthetic event: ``{"type": "text", "text": "...",
        # "snapshot": "..."}`` — emitted by ``messages.stream()`` between
        # raw deltas to simplify SDK consumers. The ``text`` field carries
        # the same incremental delta we already saw in
        # ``content_block_delta``; the ``snapshot`` field carries the
        # full accumulated text-so-far. Both can leak placeholders without
        # an unmask. We use one-shot unmask via the underlying mapping
        # (not the carry buffer) — both fields are self-contained, the
        # carry buffer is for true streaming chunks only.
        for key in ("text", "snapshot"):
            v = payload.get(key)
            if isinstance(v, str) and v:
                payload[key] = unmask_text(v, unmasker.mapping)
    elif ev_type == "message_stop":
        # Final summary event from the SDK with the entire message
        # body assembled. Mutate ``message.content[].text`` in place.
        msg = payload.get("message")
        if isinstance(msg, dict):
            content = msg.get("content")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict):
                        t = block.get("text")
                        if isinstance(t, str) and t:
                            block["text"] = unmask_text(t, unmasker.mapping)
