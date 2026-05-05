"""Pipeline orchestrator (M1 Task 10).

One :class:`Pipeline` per running sidecar. Holds the per-workspace
:class:`MappingStore` cache, dispatches incoming ``/anonymize``,
``/restore`` and ``/tool-call`` requests through the right detectors based
on policy + degraded mode, and writes the audit trail.

Detection delegates to :mod:`brikko_anonymizer.pii.masker` — the pipeline
*does not* duplicate regex / checksum / Natasha logic.

mask_text adapter shim
----------------------

The Gateway's :func:`pii.masker.mask_text` is a "give me text, get masked
text + mapping" call: it always runs the full pipeline (regex → checksum →
Natasha NER) on every invocation. M1 needs three knobs that aren't on
that signature:

* **mode-based detector skipping** — ``degraded`` skips Natasha,
  ``emergency`` skips both Natasha *and* checksum validators.
* **policy-based category filtering** — only categories listed in the
  active :class:`PolicyProfile.mask_categories` should survive.
* **confidence threshold** (Natasha only) — drop spans below
  ``natasha_min_confidence``.

We keep all that logic here in the adapter (``_mask_with_policy``)
instead of editing the masker (Hard Constraint 1: ``pii/*`` files are
byte-copies from the Gateway and re-vendored on Gateway updates). The
adapter:

1. Imports the masker's ``_PATTERNS`` table + ``_neutralise_user_placeholders``
   helper, runs regex detection inline. In ``emergency`` mode the
   per-pattern checksum validators are bypassed.
2. In ``full`` mode also runs ``find_persons`` (Natasha) for NAME spans
   on regions not consumed by regex; below ``min_confidence`` are
   dropped.
3. Post-filters the produced mapping by ``policy.mask_categories`` —
   any placeholder whose category is not allowed is rolled back into
   the masked text.

Category names: the masker emits ``NAME`` / ``PHONE`` / ``PASSPORT``
while :data:`policy.ALL_CATEGORIES` uses ``PERSON`` / ``PHONE_RU`` /
``PASSPORT_RU``. We normalise via :data:`_CATEGORY_ALIASES` only for the
policy-filter check; the mapping store keeps the masker's names so
restore round-trips are byte-identical.

This shim is logged as a Gateway-side refactor candidate in
``M1_FOLLOWUPS.md``.
"""
from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

from . import audit_log, policy
from .errors import MappingDecryptError, TrustViolationError
from .mapping_store import MappingStore
from .pii.masker import (
    _PATTERNS,
    PiiMapping,
    _neutralise_user_placeholders,
    unmask_text,
)
from .policy import PolicyProfile, ToolPolicies

# Map masker category → policy category (only where they diverge).
# Both directions are wired so the policy-filter accepts either spelling.
_CATEGORY_ALIASES: dict[str, str] = {
    "NAME": "PERSON",
    "PHONE": "PHONE_RU",
    "PASSPORT": "PASSPORT_RU",
}


def _is_allowed(masker_cat: str, allowed: frozenset[str]) -> bool:
    """True iff ``masker_cat`` (or its policy alias) is in ``allowed``."""
    if masker_cat in allowed:
        return True
    alias = _CATEGORY_ALIASES.get(masker_cat)
    return alias is not None and alias in allowed


_PLACEHOLDER_RE = re.compile(r"<[A-Z_]+_\d+>")


@dataclass(frozen=True)
class Entity:
    placeholder: str
    category: str
    confidence: float


@dataclass(frozen=True)
class AnonymizeResult:
    masked_text: str
    entities: list[Entity]
    degraded_mode: bool
    latency_ms: int


@dataclass(frozen=True)
class RestoreResult:
    restored_text: str
    hallucinated: list[str]
    latency_ms: int


# ---------------------------------------------------------------------------
# adapter — replaces the call to Gateway's mask_text + post-filters by policy
# ---------------------------------------------------------------------------


def _mask_with_policy(
    text: str,
    *,
    profile: PolicyProfile,
    mode: str,
) -> tuple[str, dict[str, dict[str, Any]]]:
    """Adapter shim around :func:`pii.masker` honouring policy + degraded mode.

    Returns ``(masked_text, info_map)`` where ``info_map`` is
    ``{placeholder: {"original": str, "category": str, "confidence": float}}``.
    Empty input is a no-op.
    """
    if not text:
        return text, {}

    # Defang any literal `<TYPE_N>` strings the user typed themselves
    # (Sprint 5 hardening — kept identical to the Gateway masker).
    text = _neutralise_user_placeholders(text)

    skip_natasha = mode in ("degraded", "emergency")
    skip_checksums = mode == "emergency"

    detections: list[tuple[int, int, str, str, str | None, float]] = []
    consumed: list[tuple[int, int]] = []

    def _overlaps(span: tuple[int, int]) -> bool:
        s, e = span
        return any(s < ce and e > cs for cs, ce in consumed)

    # Pass 1 — regex (always on).
    for pii_type, regex, validator in _PATTERNS:
        for m in regex.finditer(text):
            span = m.span()
            if _overlaps(span):
                continue
            matched = m.group(0)
            if validator is not None and not skip_checksums:
                if not validator(matched):
                    continue
            # Regex-detected entities get confidence = 1.0 (deterministic).
            detections.append((span[0], span[1], pii_type, matched, None, 1.0))
            consumed.append(span)

    # Pass 2 — Natasha PERSON spans (only in full mode).
    if not skip_natasha:
        from .pii.ru_person import find_persons  # lazy — Natasha is heavy

        for person in find_persons(text):
            span = (person.start, person.end)
            if _overlaps(span):
                continue
            confidence = float(getattr(person, "confidence", 1.0))
            if confidence < profile.natasha_min_confidence:
                continue
            detections.append(
                (
                    person.start,
                    person.end,
                    "NAME",
                    person.surface,
                    person.normalized,
                    confidence,
                )
            )
            consumed.append(span)

    detections.sort(key=lambda d: d[0])

    # Filter by policy.mask_categories (drop disallowed before placeholder
    # numbering so the per-category counters don't get gaps).
    detections = [
        d for d in detections if _is_allowed(d[2], profile.mask_categories)
    ]

    if not detections:
        return text, {}

    # Build masked text + info map. Same dedup scheme as the Gateway
    # masker: cache key = normalised lemma if present, else surface.
    out: list[str] = []
    cursor = 0
    forward: dict[str, str] = {}
    counters: dict[str, int] = {}
    info: dict[str, dict[str, Any]] = {}
    for start, end, pii_type, surface, normalized, conf in detections:
        if start > cursor:
            out.append(text[cursor:start])
        cache_key = normalized if normalized is not None else surface
        placeholder = forward.get(cache_key)
        if placeholder is None:
            n = counters.get(pii_type, 0) + 1
            counters[pii_type] = n
            placeholder = f"<{pii_type}_{n}>"
            forward[cache_key] = placeholder
            info[placeholder] = {
                "original": surface,
                "category": pii_type,
                "confidence": conf,
            }
        out.append(placeholder)
        cursor = end
    if cursor < len(text):
        out.append(text[cursor:])
    return "".join(out), info


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


class Pipeline:
    """Stateful orchestrator: workspace store cache + audit + policy dispatch."""

    def __init__(
        self,
        degraded_mode_provider: Callable[[], str],
        tool_policies: Optional[ToolPolicies] = None,
    ) -> None:
        self._mode = degraded_mode_provider
        self._tool_policies = tool_policies or ToolPolicies.default()
        self._stores: dict[str, MappingStore] = {}

    # ------------------------------------------------------------- store

    def _store(self, workspace_id: str) -> MappingStore:
        s = self._stores.get(workspace_id)
        if s is None:
            s = MappingStore(workspace_id)
            self._stores[workspace_id] = s
        return s

    # --------------------------------------------------------- anonymize

    def anonymize(
        self,
        workspace_id: str,
        *,
        text: str,
        policy_profile: str,
        session_id: str,
        request_id: str,
    ) -> AnonymizeResult:
        t0 = time.perf_counter()
        prof = policy.profile(policy_profile)
        mode = self._mode()

        masked, info = _mask_with_policy(text, profile=prof, mode=mode)

        store = self._store(workspace_id)
        entities: list[Entity] = []
        for placeholder, meta in info.items():
            original = meta["original"]
            category = meta["category"]
            confidence = float(meta["confidence"])
            subject_hash = hashlib.sha256(
                original.encode("utf-8")
            ).hexdigest()[:16]
            store.put(
                placeholder,
                original,
                category=category,
                session_id=session_id,
                subject_hash=subject_hash,
            )
            entities.append(
                Entity(
                    placeholder=placeholder,
                    category=category,
                    confidence=confidence,
                )
            )
            audit_log.write(
                {
                    "workspace_id": workspace_id,
                    "event_type": "anonymize",
                    "placeholder": placeholder,
                    "category": category,
                    "request_id": request_id,
                    "policy_profile": policy_profile,
                    "degraded_mode": mode,
                }
            )

        return AnonymizeResult(
            masked_text=masked,
            entities=entities,
            degraded_mode=(mode != "full"),
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # ----------------------------------------------------------- restore

    def restore(
        self,
        workspace_id: str,
        *,
        text: str,
        request_id: str,
    ) -> RestoreResult:
        t0 = time.perf_counter()
        store = self._store(workspace_id)
        placeholders = set(_PLACEHOLDER_RE.findall(text))

        mapping = PiiMapping()
        hallucinated: list[str] = []
        restored_phs: list[str] = []
        for ph in placeholders:
            try:
                original = store.get(ph)
            except MappingDecryptError:
                # Treat unreadable rows as missing — defensive: response
                # less broken with a stray <NAME_3> than with a 500.
                original = None
            if original is None:
                hallucinated.append(ph)
            else:
                mapping.reverse[ph] = original
                mapping.forward[original] = ph
                restored_phs.append(ph)

        restored = unmask_text(text, mapping)

        for ph in restored_phs:
            audit_log.write(
                {
                    "workspace_id": workspace_id,
                    "event_type": "restore",
                    "placeholder": ph,
                    "category": ph[1:].split("_", 1)[0]
                    if "_" in ph
                    else "UNKNOWN",
                    "request_id": request_id,
                    "policy_profile": "n/a",
                    "degraded_mode": self._mode(),
                }
            )

        return RestoreResult(
            restored_text=restored,
            hallucinated=hallucinated,
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # ----------------------------------------- deanonymize_tool_args

    def deanonymize_tool_args(
        self,
        workspace_id: str,
        *,
        tool_name: str,
        args: dict[str, Any],
        policy_override: Optional[str] = None,
        request_id: str,
    ) -> tuple[dict[str, Any], list[str]]:
        tp = self._tool_policies.for_tool(tool_name)
        mode = policy_override or tp.mode

        if mode == "forbid":
            raise TrustViolationError(
                f"tool {tool_name!r} is denied by policy"
            )
        if mode == "forward_masked":
            return args, []

        # deanonymize / forward_then_remask: substitute placeholders in
        # the listed string keys (or all string keys if tp.keys empty).
        store = self._store(workspace_id)
        out: dict[str, Any] = {}
        deanonymized_keys: list[str] = []
        for k, v in args.items():
            if isinstance(v, str) and (not tp.keys or k in tp.keys):
                new_v, changed = self._substitute_placeholders(v, store)
                if changed:
                    deanonymized_keys.append(k)
                out[k] = new_v
            else:
                out[k] = v

        if deanonymized_keys:
            audit_log.write(
                {
                    "workspace_id": workspace_id,
                    "event_type": "tool_call_deanonymize",
                    "placeholder": "*",
                    "category": "n/a",
                    "request_id": request_id,
                    "policy_profile": "n/a",
                    "degraded_mode": self._mode(),
                    "tool_name": tool_name,
                }
            )
        return out, deanonymized_keys

    @staticmethod
    def _substitute_placeholders(
        s: str, store: MappingStore
    ) -> tuple[str, bool]:
        """Replace every ``<X_N>`` in ``s`` for which the store has a row.

        Unknown placeholders are left as-is (same forgiving stance as
        :func:`unmask_text`). Returns ``(new_string, changed?)``.
        """
        changed = False

        def _sub(m: re.Match[str]) -> str:
            nonlocal changed
            ph = m.group(0)
            try:
                original = store.get(ph)
            except MappingDecryptError:
                return ph
            if original is None:
                return ph
            changed = True
            return original

        return _PLACEHOLDER_RE.sub(_sub, s), changed

    # ----------------------------------------------------------- close

    def close(self) -> None:
        for s in self._stores.values():
            s.close()
        self._stores.clear()


__all__ = [
    "AnonymizeResult",
    "Entity",
    "Pipeline",
    "RestoreResult",
]
