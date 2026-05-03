"""Tests for policy profiles + tool-call policies."""
from __future__ import annotations

import textwrap

import pytest

from brikko_anonymizer import policy


def test_profile_strict_masks_all_categories():
    p = policy.profile("strict")
    assert p.mask_categories == policy.ALL_CATEGORIES
    assert p.natasha_min_confidence == 0.5


def test_profile_balanced_default():
    p = policy.profile("balanced")
    assert "PERSON" in p.mask_categories
    assert "EMAIL" in p.mask_categories
    assert "URL" not in p.mask_categories
    assert "IP" not in p.mask_categories
    assert p.natasha_min_confidence == 0.75


def test_profile_permissive_only_critical():
    p = policy.profile("permissive")
    assert p.mask_categories == frozenset({"PASSPORT_RU", "SNILS", "INN", "CARD"})
    assert p.natasha_min_confidence == 0.9


def test_unknown_profile_raises():
    with pytest.raises(ValueError, match="unknown profile"):
        policy.profile("unsafe")


def test_tool_policy_yaml_loader(tmp_path):
    cfg = tmp_path / "tp.yaml"
    cfg.write_text(
        textwrap.dedent(
            """
            tools:
              bitrix24.deals.list: { mode: deanonymize, keys: [client] }
              third_party_ai.send: { mode: forbid }
            defaults: { mode: forward_masked }
            """
        ),
        encoding="utf-8",
    )
    tp = policy.ToolPolicies.load(cfg)
    assert tp.for_tool("bitrix24.deals.list").mode == "deanonymize"
    assert tp.for_tool("bitrix24.deals.list").keys == ["client"]
    assert tp.for_tool("third_party_ai.send").mode == "forbid"
    assert tp.for_tool("unregistered.x").mode == "forward_masked"


def test_tool_policy_default_when_no_yaml():
    tp = policy.ToolPolicies.default()
    assert tp.for_tool("anything.x").mode == "forward_masked"
