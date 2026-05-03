"""Policy profiles + tool-call policies for the anonymizer.

Two orthogonal axes of operator-tunable policy:

1. **Profile** (``strict`` / ``balanced`` / ``permissive``): which PII
   categories get masked, and Natasha's confidence cutoff for the PERSON
   recogniser. Applied to *every* outbound LLM/tool payload.

2. **Tool policy** (per fully-qualified tool name): how to handle the
   placeholder→original mapping when a tool is invoked.

   * ``deanonymize`` — replace placeholders in the named ``keys`` with their
     originals (trusted internal tools: Bitrix24, 1C).
   * ``forbid`` — block the call entirely (e.g. ``third_party_ai.send``).
   * ``forward_masked`` — pass placeholders through untouched (deny-by-default
     for any unregistered tool — raw PII never leaks).
   * ``forward_then_remask`` — forward with placeholders, then re-mask any
     newly-discovered PII in the response.

The default for an unregistered tool is ``forward_masked``: raw originals
require an explicit allowlist entry to escape the sidecar.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import yaml

ToolMode = Literal["deanonymize", "forbid", "forward_masked", "forward_then_remask"]

#: All 16 categories the masker can produce.
ALL_CATEGORIES: frozenset[str] = frozenset(
    {
        "PERSON",
        "EMAIL",
        "PHONE_RU",
        "INN",
        "SNILS",
        "PASSPORT_RU",
        "CARD",
        "BANK_ACCOUNT",
        "ADDRESS_RU",
        "CAR_PLATE_RU",
        "OGRN",
        "OGRNIP",
        "BIK",
        "URL",
        "IP",
        "DOB",
    }
)

#: 152-ФЗ "критические идентификаторы": always masked even on permissive profile.
CRITICAL_CATEGORIES: frozenset[str] = frozenset({"PASSPORT_RU", "SNILS", "INN", "CARD"})


@dataclass(frozen=True)
class PolicyProfile:
    """Immutable policy profile."""

    name: str
    mask_categories: frozenset[str]
    natasha_min_confidence: float


_PROFILES: dict[str, PolicyProfile] = {
    "strict": PolicyProfile(
        name="strict",
        mask_categories=ALL_CATEGORIES,
        natasha_min_confidence=0.5,
    ),
    "balanced": PolicyProfile(
        name="balanced",
        mask_categories=ALL_CATEGORIES - frozenset({"URL", "IP"}),
        natasha_min_confidence=0.75,
    ),
    "permissive": PolicyProfile(
        name="permissive",
        mask_categories=CRITICAL_CATEGORIES,
        natasha_min_confidence=0.9,
    ),
}


def profile(name: str) -> PolicyProfile:
    """Return a built-in profile by name. Raises ``ValueError`` on unknown name."""
    try:
        return _PROFILES[name]
    except KeyError:
        raise ValueError(f"unknown profile: {name!r}") from None


@dataclass(frozen=True)
class ToolPolicy:
    """How to handle a particular tool call."""

    mode: ToolMode
    keys: list[str] = field(default_factory=list)


@dataclass
class ToolPolicies:
    """Registry: tool-name → :class:`ToolPolicy`, with a fallback default."""

    by_tool: dict[str, ToolPolicy]
    default: ToolPolicy

    @classmethod
    def default(cls) -> "ToolPolicies":
        """Empty registry — every tool falls through to ``forward_masked``."""
        return cls(by_tool={}, default=ToolPolicy(mode="forward_masked"))

    @classmethod
    def load(cls, path: Path) -> "ToolPolicies":
        """Load a YAML config:

        .. code-block:: yaml

            tools:
              bitrix24.deals.list: { mode: deanonymize, keys: [client] }
            defaults: { mode: forward_masked }
        """
        data = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
        by_tool: dict[str, ToolPolicy] = {}
        for tool_name, cfg in (data.get("tools") or {}).items():
            cfg = cfg or {}
            mode = cfg.get("mode", "forward_masked")
            keys = list(cfg.get("keys", []) or [])
            by_tool[tool_name] = ToolPolicy(mode=mode, keys=keys)
        defaults_cfg = data.get("defaults") or {}
        default = ToolPolicy(
            mode=defaults_cfg.get("mode", "forward_masked"),
            keys=list(defaults_cfg.get("keys", []) or []),
        )
        return cls(by_tool=by_tool, default=default)

    def for_tool(self, name: str) -> ToolPolicy:
        return self.by_tool.get(name, self.default)
