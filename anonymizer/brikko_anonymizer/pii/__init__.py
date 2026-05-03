"""PII-маскинг для 152-ФЗ слоя (Sprint 4 Поток M).

См. ``masker.py`` для основного API. ``store.py`` отвечает за Redis-mapping
``request_id → {placeholder: original}`` с TTL ~1ч.

Архитектура:

    ┌─ chat handler ──────────────────────────────────────────────┐
    │  if account.pii_masking_enabled or request.pii_protect:     │
    │    masked_messages, mapping = mask_messages(...)            │
    │    await store.save(request_id, mapping, ttl=3600)          │
    │    response = provider.chat(masked_messages)                │
    │    mapping = await store.load(request_id)                   │
    │    response.content = unmask(response.content, mapping)     │
    └──────────────────────────────────────────────────────────────┘

Стратегия V1.5: regex для основных РФ-форматов (телефоны +7..., паспорт
0000 000000, ИНН 10/12 цифр, СНИЛС, email, банковские карты, ФИО как
3 заглавные подряд кириллицы). Pluggable интерфейс (см. ``Detector``)
позволит в V2 подменить на Microsoft Presidio / OpenAI Privacy Filter
без изменений в chat-handler'е.
"""

from __future__ import annotations

from brikko_anonymizer.pii.integration import (
    compute_pii_flags,
    compute_pii_flags_optin_only,
    header_flag_truthy,
    resolve_account_pii_flag,
    stream_unmask_anthropic_event,
    stream_unmask_chunk_openai,
    unmask_payload_anthropic,
    unmask_payload_openai,
)
from brikko_anonymizer.pii.masker import (
    PiiAuditEntry,
    PiiMapping,
    audit_summary,
    detect_pii,
    mask_messages,
    mask_text,
    unmask_text,
)
from brikko_anonymizer.pii.store import PiiMappingStore
from brikko_anonymizer.pii.streaming import StreamUnmasker

__all__ = [
    "PiiAuditEntry",
    "PiiMapping",
    "PiiMappingStore",
    "StreamUnmasker",
    "audit_summary",
    "compute_pii_flags",
    "compute_pii_flags_optin_only",
    "detect_pii",
    "header_flag_truthy",
    "mask_messages",
    "mask_text",
    "resolve_account_pii_flag",
    "stream_unmask_anthropic_event",
    "stream_unmask_chunk_openai",
    "unmask_payload_anthropic",
    "unmask_payload_openai",
    "unmask_text",
]
