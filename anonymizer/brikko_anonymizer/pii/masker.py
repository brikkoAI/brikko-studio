"""Regex-based PII detector + masker (Sprint 4 Поток M, V1.5).

Forward-compatible: интерфейсы ``mask_messages`` / ``unmask_text`` стабильны;
в V2 движок regex'ов будет подменён на Microsoft Presidio (поддержка
русского, ML-based NER для ФИО, контекст-aware дисамбигуация). API наружу
не меняется.

Что маскируем (РФ-специфика по 152-ФЗ):

* **EMAIL** — RFC-5322 lite: ``[\\w.+-]+@[\\w-]+\\.[\\w.-]+``
* **PHONE** — российские форматы ``+7``/``8`` с разделителями. Жёстко 11 цифр.
* **PASSPORT** — РФ паспорт: ``XXXX XXXXXX`` (4+6, через пробел/дефис/без).
* **INN** — 10 цифр (юр.лицо) или 12 (физ.лицо), с word-boundary.
* **SNILS** — ``XXX-XXX-XXX YY`` (11 цифр с разделителями).
* **CARD** — банковская карта: 16 цифр с разделителями (Luhn-агностично).
* **NAME** — ФИО: три подряд слова с заглавных букв кириллицы (Иванов
  Иван Иванович). Эвристика, может давать false-positive — но over-masking
  безопаснее для compliance.

Placeholder-формат: ``<TYPE_N>`` где N — порядковый номер (1-based) в рамках
одного request'а. Один и тот же original получает один placeholder
(дедупликация) — это ВАЖНО: если в prompt'е дважды упомянут "Иван Иванов",
оба раза получают ``<NAME_1>``, и провайдер видит одну сущность вместо двух
разных. Это критично для качества ответа модели.

Порядок применения: длинные паттерны сначала (паспорт перед ИНН перед телефоном),
чтобы не было каскадного match'а на одной подстроке.

Edge cases:

* Если контент сообщения — список блоков (``content: [{"type": "text", ...}]``,
  vision/multimodal), маскируем только text-блоки. ``image_url``, ``input_audio``,
  ``tool_use`` — не трогаем.
* ``tool_call_id``, ``name``, ``role`` — не маскируем (это служебные поля).
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Any, Final

from brikko_anonymizer.pii.checksums import inn10, inn12, luhn, ogrn, ogrnip, snils

# ---------- patterns ----------------------------------------------------------
#
# Each tuple: (pii_type, compiled_regex, normalise_fn).
# Order matters — long-form patterns (passport, card) MUST appear before
# short patterns (INN, phone) so they don't get partially eaten.
#
# All patterns use non-capturing groups where possible. The full match
# (``m.group(0)``) is what gets replaced.

# Email — practical subset of RFC 5322. We don't validate per spec, just
# good-enough to catch real addresses without choking on edge punctuation.
_EMAIL_RE: Final = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# Russian phone numbers: +7 / 8 followed by 10 more digits, with optional
# separators (space, dash, parentheses, dot). We use a strict total-digit
# count via a callable check after match — regex alone with [\s\-().]*
# matches too eagerly across paragraph breaks.
_PHONE_RE: Final = re.compile(
    r"(?:\+7|\b8)[\s\-().]{0,3}\d{3}[\s\-().]{0,3}\d{3}[\s\-().]{0,3}\d{2}[\s\-().]{0,3}\d{2}\b"
)

# RU passport: 4 digits (series) + 6 digits (number). Allow 1 separator.
_PASSPORT_RE: Final = re.compile(r"\b\d{4}[\s\-]?\d{6}\b")

# Bank card: 16 digits with optional spaces/dashes between groups of 4.
# We require all four groups to make false positives on long ID numbers
# less likely. Captured before INN so a 16-digit run isn't split.
_CARD_RE: Final = re.compile(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b")

# СНИЛС: XXX-XXX-XXX YY (11 digits with two dashes and a space).
_SNILS_RE: Final = re.compile(r"\b\d{3}-\d{3}-\d{3}\s\d{2}\b")

# ИНН: 10 (юр.лицо) и 12 (физ.лицо/ИП) — отдельные паттерны, чтобы каждый
# гонял свой validator (Sprint 13 / Privacy v2 — Task 1.2). До раздельных
# регэкспов validator не мог различать длину и решать какую КС-функцию
# вызвать. Категория плейсхолдера у обоих общая — "INN" (backward compat
# с уже выпущенным API).
_INN10_RE: Final = re.compile(r"(?<!\d)\d{10}(?!\d)")
_INN12_RE: Final = re.compile(r"(?<!\d)\d{12}(?!\d)")

# ОГРН (13) / ОГРНИП (15) — простые «N подряд цифр» без сепараторов в
# каноне. Реальные документы могут разделять; КС-валидатор стрипает.
_OGRN_RE: Final = re.compile(r"(?<!\d)\d{13}(?!\d)")
_OGRNIP_RE: Final = re.compile(r"(?<!\d)\d{15}(?!\d)")

# Расчётный счёт юрлица — 20 цифр. Структурный валидатор (БИК-зависимый
# КС) требует справочника ЦБ РФ — оставляем regex-only до v3 backlog.
# Тег по-прежнему BANK_ACCOUNT для аудит-отчётов.
_BANK_ACCOUNT_RE: Final = re.compile(r"(?<!\d)\d{20}(?!\d)")

# ФИО (Russian): three consecutive Capital-cased Cyrillic words.
#
# DEPRECATED — оставлен в модуле, но НЕ включён в ``_PATTERNS``: с Sprint 13 /
# Privacy v2 Phase 2 (Task 2.3) PERSON-детекция делегирована Natasha
# (`pii.ru_person.find_persons`) — морфологический NER + yargy fallback,
# который ловит склонения («Иванову» → Иванов) и не false-positive'ит
# на «Москва Россия Кремль». Regex-конст оставлен только для backward-
# compat внешних модулей, которые могут импортировать его (см. `__all__`).
_NAME_RE: Final = re.compile(r"\b[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){1,2}\b")


# Order = priority. Each entry: (type, regex, validator-or-None).
# The validator runs on the matched substring; returning False skips the
# match (used for phone digit count, КС РФ-идентификаторов, Luhn для карт).
def _validate_phone(match_text: str) -> bool:
    """Phone matcher requires exactly 11 digits after stripping separators."""
    digits = re.sub(r"\D", "", match_text)
    return len(digits) == 11 and digits.startswith(("7", "8"))


# Sprint 13 / Privacy v2 — Phase 1, Task 1.2. Wire'ы checksums-валидаторов:
# regex без КС даёт ~90 % ложных срабатываний на любых длинных цифровых
# последовательностях в логах (timestamps, ID, hashes). КС устраняет это
# почти бесплатно — несколько умножений на запрос.
#
# Порядок: longest digit-form FIRST so spans фиксируются для overlap-логики.
# 1. BANK_ACCOUNT (20)
# 2. CARD (16) — с разделителями \b...\b
# 3. OGRNIP (15)
# 4. OGRN (13)
# 5. INN12 (12)
# 6. PHONE (11 with +7/8 prefix)
# 7. SNILS (11 with -- formatting)
# 8. INN10 (10) — ДО PASSPORT, чтобы valid 10-digit ИНН без сепаратора
#    сначала валидировался КС'ом (не съедался passport-pattern'ом).
# 9. PASSPORT (10 — 4+6, separator опционален)
# 10. EMAIL
# 11. NAME
#
# Категория плейсхолдера для INN10 и INN12 — общая "INN" (backward compat
# с уже выпущенным API: <INN_1>, не <INN10_1> / <INN12_1>). `_PATTERNS`
# просто список tuples — два tuple с одинаковой категорией, но разными
# regex+validator работают: encoder ищет следующий слот по category.
_PATTERNS: Final[list[tuple[str, re.Pattern[str], Callable[[str], bool] | None]]] = [
    ("BANK_ACCOUNT", _BANK_ACCOUNT_RE, None),  # ЦБ-регистр КС — backlog v3
    ("CARD", _CARD_RE, lambda m: luhn(m)),
    ("OGRNIP", _OGRNIP_RE, lambda m: ogrnip(m)),
    ("OGRN", _OGRN_RE, lambda m: ogrn(m)),
    ("INN", _INN12_RE, lambda m: inn12(m)),
    ("PHONE", _PHONE_RE, _validate_phone),
    ("SNILS", _SNILS_RE, lambda m: snils(m)),
    ("INN", _INN10_RE, lambda m: inn10(m)),
    ("PASSPORT", _PASSPORT_RE, None),
    ("EMAIL", _EMAIL_RE, None),
    # NAME removed — handled by Natasha-based span pipeline below
    # (Sprint 13 / Privacy v2 — Task 2.3).  Order in `_PATTERNS` defines
    # priority: regex spans (passport/INN/SNILS/CARD) are processed FIRST,
    # then `find_persons` adds NAME spans only on text that survived
    # regex masking — so PER-tagged organisation around a valid ИНН gets
    # the ИНН placeholder, not a NAME one (spec §3.5 cross-category).
]


# ---------- public types ------------------------------------------------------


@dataclass
class PiiMapping:
    """One direction of the request's PII dictionary.

    ``forward`` is what the masker writes into prompts (the actual
    placeholder). ``reverse`` is what unmask uses to put the original
    string back into the model's response.

    We store both directions to keep ``unmask_text`` an O(1) lookup per
    placeholder rather than a dict.values()-scan. The two are dual; the
    serialiser only needs ``reverse`` to round-trip.
    """

    # original → "<TYPE_N>"
    forward: dict[str, str] = field(default_factory=dict)
    # "<TYPE_N>" → original
    reverse: dict[str, str] = field(default_factory=dict)
    # type → next sequence number (1-based). Used by the encoder to assign
    # stable IDs across multiple text passes within the same request.
    counters: dict[str, int] = field(default_factory=dict)

    def is_empty(self) -> bool:
        return not self.reverse

    @property
    def size(self) -> int:
        return len(self.reverse)

    def to_redis_dict(self) -> dict[str, str]:
        """Project to a flat str→str dict for Redis HSET (only ``reverse`` —
        forward is rebuildable on read)."""
        return dict(self.reverse)

    @classmethod
    def from_redis_dict(cls, d: dict[str, str]) -> PiiMapping:
        rev = dict(d)
        fwd = {v: k for k, v in rev.items()}
        return cls(forward=fwd, reverse=rev, counters={})


@dataclass
class PiiAuditEntry:
    """One row for the structured audit log.

    Holds only types and counts — no plaintext PII ever lands in the audit
    record. That's the whole point of the masking layer.
    """

    pii_type: str
    count: int


# ---------- detection / masking -----------------------------------------------


def _collect_detections(
    text: str,
) -> list[tuple[int, int, str, str, str | None]]:
    """Collect all PII detections in priority order.

    Returns ``[(start, end, pii_type, surface, normalized), ...]`` sorted
    by start ASC, with overlapping spans resolved by *priority* — the
    first recogniser to claim a span wins.

    Priority order (highest → lowest):

    1. Regex-based recognisers in :data:`_PATTERNS` declaration order
       (BANK_ACCOUNT, CARD, OGRNIP, OGRN, INN-12, PHONE, SNILS, INN-10,
       PASSPORT, EMAIL).  All of these have either a strict format,
       checksum validator, or both — so they're more reliable than NER.
    2. Natasha PERSON spans from :pyfunc:`find_persons` — span-based,
       only added on regions not yet consumed.

    The ``normalized`` slot is ``None`` for regex categories (their key
    in the placeholder cache is the surface form itself); for NAME spans
    it's the nominative-case lemma — used by `mask_text` so different
    declensions of the same surname collapse onto one placeholder.
    """
    detections: list[tuple[int, int, str, str, str | None]] = []
    consumed: list[tuple[int, int]] = []

    def _overlaps(span: tuple[int, int]) -> bool:
        s, e = span
        return any(s < ce and e > cs for cs, ce in consumed)

    # Pass 1 — regex recognisers (highest priority; strict + checksums).
    for pii_type, regex, validator in _PATTERNS:
        for m in regex.finditer(text):
            span = m.span()
            if _overlaps(span):
                continue
            matched = m.group(0)
            if validator is not None and not validator(matched):
                continue
            detections.append((span[0], span[1], pii_type, matched, None))
            consumed.append(span)

    # Pass 2 — Natasha PERSON spans (lower priority, fills NAME-only gaps).
    # Local import keeps the cold-start cost off any caller that doesn't
    # need PERSON detection (e.g. tests that exercise EMAIL only).
    from brikko_anonymizer.pii.ru_person import find_persons

    for person in find_persons(text):
        span = (person.start, person.end)
        if _overlaps(span):
            continue
        detections.append(
            (person.start, person.end, "NAME", person.surface, person.normalized)
        )
        consumed.append(span)

    detections.sort(key=lambda d: d[0])
    return detections


def detect_pii(text: str) -> list[tuple[str, str]]:
    """Return ``[(type, surface), ...]`` in detection order.

    Used for tests + audit aggregation.  The masker does its own scan
    using the same recognisers; this helper is for callers who want to
    know "is there PII here?" without producing replacements.

    NAME spans come from the Natasha-based `find_persons` (Sprint 13 /
    Privacy v2 — Task 2.3); the legacy `_NAME_RE` regex heuristic is no
    longer wired into `_PATTERNS`.
    """
    if not text:
        return []
    return [(t, surface) for _s, _e, t, surface, _n in _collect_detections(text)]


def mask_text(text: str, mapping: PiiMapping) -> str:
    """Replace PII in ``text`` with placeholders, mutating ``mapping`` in place.

    Stable across calls: re-scanning the same input with the same mapping
    re-uses existing placeholders (so ``"a@b.io ... a@b.io"`` always
    becomes ``"<EMAIL_1> ... <EMAIL_1>"`` even when called twice).

    For PERSON entities (Sprint 13 / Privacy v2 — Task 2.3) the cache
    key is the **normalised** form (nominative lemma) rather than the
    surface form, so different declensions of the same person collapse
    onto a single placeholder — for example
    ``"Иванов сказал Иванову"`` →
    ``"<NAME_1> сказал <NAME_1>"``.  The reverse mapping stores the
    *first* surface form encountered, which is what gets restored if the
    LLM emits ``<NAME_1>`` in its response (mild grammar mismatch
    accepted as a known trade-off — placeholder dedup matters more for
    model context than restored declension).

    Returns the masked text. If no PII is detected, returns the original
    unchanged. Empty input is a no-op.

    Sprint 5 hardening: any literal ``<TYPE_N>``-shaped substring in the
    user-supplied text is neutralised first so the unmask round-trip
    can't be tricked into substituting one user's PII into adversarial
    placeholder strings sent in the same request.
    """
    if not text:
        return text
    text = _neutralise_user_placeholders(text)

    detections = _collect_detections(text)
    if not detections:
        return text

    out: list[str] = []
    cursor = 0
    for start, end, pii_type, surface, normalized in detections:
        if start > cursor:
            out.append(text[cursor:start])
        # Cache key:
        #   - regex categories (EMAIL/PHONE/...): keyed by the surface
        #     literally — there's no morphology, identical strings are
        #     the same entity.
        #   - NAME: keyed by `normalized` so declensions collapse onto
        #     the same placeholder slot.
        cache_key = normalized if normalized is not None else surface
        placeholder = mapping.forward.get(cache_key)
        if placeholder is None:
            n = mapping.counters.get(pii_type, 0) + 1
            mapping.counters[pii_type] = n
            placeholder = f"<{pii_type}_{n}>"
            mapping.forward[cache_key] = placeholder
            # Reverse stores the FIRST surface form — that's what unmask
            # restores when the LLM emits the placeholder back.
            mapping.reverse[placeholder] = surface
        out.append(placeholder)
        cursor = end
    if cursor < len(text):
        out.append(text[cursor:])
    return "".join(out)


# Pre-compiled placeholder pattern for unmask. Matches anything emitted by
# ``mask_text`` plus tolerates whitespace normalisation by the model
# (``< NAME_1 >`` stays unmodified — we only restore exact placeholders).
_PLACEHOLDER_RE: Final = re.compile(
    r"<(?:NAME|EMAIL|PHONE|PASSPORT|INN|SNILS|CARD|OGRN|OGRNIP|BANK_ACCOUNT)_\d+>"
)


def _neutralise_user_placeholders(text: str) -> str:
    """Defang any literal `<TYPE_N>` strings the user typed themselves.

    Without this, an adversarial prompt containing the string ``<NAME_1>``
    would round-trip as the OTHER PII this request masked under that ID
    (Sprint 5 bug-hunt). Replace ``<`` with the visually-identical
    fullwidth ``＜`` so the model still sees the intent of the literal,
    but our `_PLACEHOLDER_RE` no longer matches.

    Idempotent — running it twice is the same as once. Safe on text that
    contains no placeholders (the regex just returns early).
    """
    if "<" not in text:
        return text
    return _PLACEHOLDER_RE.sub(lambda m: "＜" + m.group(0)[1:], text)


def unmask_text(text: str, mapping: PiiMapping) -> str:
    """Replace ``<TYPE_N>`` placeholders in ``text`` with originals from mapping.

    Unknown placeholders (mapping miss — e.g. TTL expired before response
    arrived) are left as-is. We do NOT raise: the user-facing response is
    less broken if a stray ``<NAME_3>`` slips through than if we 500.
    """
    if not text or mapping.is_empty():
        return text

    def _replace(m: re.Match[str]) -> str:
        ph = m.group(0)
        return mapping.reverse.get(ph, ph)

    return _PLACEHOLDER_RE.sub(_replace, text)


# ---------- message-level helpers ---------------------------------------------


def _mask_content_block(block: Any, mapping: PiiMapping) -> Any:
    """Recursively mask text in a single content block (dict / list / scalar)."""
    if isinstance(block, str):
        return mask_text(block, mapping)
    if isinstance(block, dict):
        out: dict[str, Any] = {}
        for k, v in block.items():
            # Only mask known text-bearing fields. ``image_url``, ``input_audio``,
            # ``tool_use_id``, ``cache_control`` etc. are not text — leave alone.
            if k == "text" and isinstance(v, str):
                out[k] = mask_text(v, mapping)
            elif k == "content" and isinstance(v, str | list | dict):
                out[k] = _mask_content_block(v, mapping)
            else:
                out[k] = v
        return out
    if isinstance(block, list):
        return [_mask_content_block(x, mapping) for x in block]
    return block


def mask_messages(
    messages: Iterable[dict[str, Any]],
    mapping: PiiMapping | None = None,
) -> tuple[list[dict[str, Any]], PiiMapping]:
    """Walk OpenAI-shaped messages and replace PII with placeholders.

    Returns (masked_messages, mapping). If ``mapping`` is None, a fresh one
    is allocated. Pass an existing mapping to extend across multiple calls
    (rare — used only by the few code paths that mask in two phases).

    Maskable fields:

    * ``message.content`` — string OR list of content blocks.
    * Block-level ``text`` (vision messages with ``"type": "text"``).
    * ``message.tool_calls[].function.arguments`` — JSON string with possible
      PII inside (best-effort). We mask the raw string; the LLM has to deal
      with placeholders inside arguments-JSON.

    Non-maskable: ``role``, ``name``, ``tool_call_id``, ``cache_control``.
    """
    m = mapping or PiiMapping()
    out: list[dict[str, Any]] = []
    for msg in messages:
        new_msg: dict[str, Any] = {}
        for k, v in msg.items():
            if k == "content":
                new_msg[k] = _mask_content_block(v, m)
            elif k == "tool_calls" and isinstance(v, list):
                new_msg[k] = [_mask_tool_call(tc, m) for tc in v]
            else:
                new_msg[k] = v
        out.append(new_msg)
    return out, m


def _mask_tool_call(tc: Any, mapping: PiiMapping) -> Any:
    """Mask the JSON-string arguments inside a tool_call entry."""
    if not isinstance(tc, dict):
        return tc
    fn = tc.get("function")
    if not isinstance(fn, dict):
        return tc
    args = fn.get("arguments")
    if not isinstance(args, str):
        return tc
    new_fn = dict(fn)
    new_fn["arguments"] = mask_text(args, mapping)
    new_tc = dict(tc)
    new_tc["function"] = new_fn
    return new_tc


# ---------- audit helpers -----------------------------------------------------


def audit_summary(mapping: PiiMapping) -> list[PiiAuditEntry]:
    """Aggregate placeholder counts by type for structured logging.

    NEVER includes the original PII strings — only counts. The point of
    the audit log is compliance evidence ("we masked X email and Y phone
    numbers in this request") without re-leaking PII into the log layer
    that we just hardened.
    """
    by_type: dict[str, int] = {}
    for ph in mapping.reverse:
        # placeholder = "<TYPE_N>"
        try:
            t = ph[1:].split("_", 1)[0]
        except IndexError:
            continue
        by_type[t] = by_type.get(t, 0) + 1
    return [PiiAuditEntry(pii_type=t, count=c) for t, c in sorted(by_type.items())]


__all__ = [
    "PiiAuditEntry",
    "PiiMapping",
    "audit_summary",
    "detect_pii",
    "mask_messages",
    "mask_text",
    "unmask_text",
]
