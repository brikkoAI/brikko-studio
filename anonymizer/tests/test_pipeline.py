"""Tests for the Pipeline orchestrator (M1 Task 10)."""
from __future__ import annotations

import secrets

import pytest

from brikko_anonymizer import (
    mapping_store,
    paths,
    pipeline,
    workspace_key,
)


@pytest.fixture(autouse=True)
def _isolate_brikko_home(monkeypatch, tmp_path):
    """Isolate ``~/.brikko`` to a tmp dir + replace keychain with an in-memory dict.

    Same shape as the mapping_store / audit_log test fixtures so that
    workspace key generation, mapping DB writes and audit JSONL writes all
    land under ``tmp_path/.brikko`` and disappear at test teardown.
    """
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)

    keys: dict[str, bytes] = {}

    def _get(ws_id: str) -> bytes | None:
        return keys.get(ws_id)

    def _get_or_create(ws_id: str) -> bytes:
        if ws_id not in keys:
            keys[ws_id] = secrets.token_bytes(32)
        return keys[ws_id]

    monkeypatch.setattr(workspace_key, "get", _get)
    monkeypatch.setattr(workspace_key, "get_or_create", _get_or_create)
    monkeypatch.setattr(mapping_store, "_TEST_KEYS", keys, raising=False)


@pytest.fixture
def p():
    """Pipeline pinned to ``mode='full'`` — Natasha + checksums both on."""
    obj = pipeline.Pipeline(degraded_mode_provider=lambda: "full")
    try:
        yield obj
    finally:
        obj.close()


def test_anonymize_basic_inn(p):
    r = p.anonymize(
        "ws_test",
        text="ИНН компании 7707083893",
        policy_profile="balanced",
        session_id="s1",
        request_id="r1",
    )
    assert "<INN_1>" in r.masked_text
    assert "7707083893" not in r.masked_text
    assert any(e.category == "INN" for e in r.entities)
    assert r.degraded_mode is False
    assert r.latency_ms >= 0


def test_anonymize_then_restore_roundtrip(p):
    a = p.anonymize(
        "ws_test",
        text="ИНН 7707083893",
        policy_profile="balanced",
        session_id="s1",
        request_id="r1",
    )
    restored = p.restore("ws_test", text=a.masked_text, request_id="r2")
    assert "7707083893" in restored.restored_text
    assert restored.hallucinated == []


def test_restore_marks_hallucinations(p):
    a = p.anonymize(
        "ws_test",
        text="Иван Петров",
        policy_profile="strict",
        session_id="s1",
        request_id="r1",
    )
    restored = p.restore(
        "ws_test",
        text=a.masked_text + " also <NAME_999>",
        request_id="r2",
    )
    assert "<NAME_999>" in restored.hallucinated


def test_degraded_mode_skips_natasha():
    """In degraded mode the heavy Natasha pass is skipped; regex still runs."""
    p = pipeline.Pipeline(degraded_mode_provider=lambda: "degraded")
    try:
        r = p.anonymize(
            "ws_test",
            text="ИНН 7707083893 для Иванова",
            policy_profile="balanced",
            session_id="s1",
            request_id="r1",
        )
        assert "<INN_1>" in r.masked_text
        # Natasha skipped -> the surname stays plain.
        assert "Иванова" in r.masked_text
        assert r.degraded_mode is True
    finally:
        p.close()


def test_emergency_mode_skips_checksums():
    """In emergency mode the call still succeeds; checksum-invalid digits may slip."""
    p = pipeline.Pipeline(degraded_mode_provider=lambda: "emergency")
    try:
        r = p.anonymize(
            "ws_test",
            # 1234567890 is NOT a valid ИНН (КС fails) — in full mode it
            # would not be masked, in emergency it might (regex-only).
            text="Number 1234567890 here",
            policy_profile="balanced",
            session_id="s1",
            request_id="r1",
        )
        # Outcome on the digits is implementation-defined; what matters is
        # the call did not raise and degraded_mode is True.
        assert r.degraded_mode is True
    finally:
        p.close()
