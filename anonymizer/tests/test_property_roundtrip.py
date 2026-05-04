"""Hypothesis property tests — round-trip invariants (M1 Task 18).

Two invariants we want to be true *for any* (text, value) input:

1. **Pipeline round-trip:** ``restore(anonymize(text)) == text`` modulo
   whitespace normalisation. Catches encoding bugs in the AES-GCM path,
   placeholder collisions, off-by-one in the masker.
2. **MappingStore round-trip:** ``store.get(store.put(value)) == value``
   for any UTF-8 string. Catches BLOB / nonce / AAD encoding bugs.

The fixture monkeypatches ``paths.brikko_root`` and ``workspace_key.{get,
get_or_create}`` so each test gets an isolated tmp dir + fresh in-memory
keychain (no real OS keychain hits). This pattern matches the ``conftest.py``
``api_isolate`` fixture used by the API tests.

Alphabet narrowing: we exclude surrogates (Cs) and ASCII control chars
(< 0x20) to avoid Natasha tokeniser explosions and SQLite's quirks with
embedded NULs. The 0x20-0x4FF range covers Latin + Cyrillic + most
Eastern-European scripts which is the realistic input domain.
"""
from __future__ import annotations

import secrets
from typing import Iterator

import pytest
from hypothesis import HealthCheck, given, settings, strategies as st

from brikko_anonymizer import mapping_store, paths, pipeline as pipeline_mod, workspace_key

_text_strategy = st.text(
    alphabet=st.characters(
        blacklist_categories=("Cs",),
        min_codepoint=0x20,
        max_codepoint=0x4FF,
    ),
    min_size=0,
    max_size=200,
)


@pytest.fixture(autouse=True)
def _setup(tmp_path, monkeypatch) -> Iterator[None]:
    """Per-test isolation — tmp BRIKKO_HOME + fake in-memory keychain."""
    monkeypatch.setattr(paths, "brikko_root", lambda: tmp_path / ".brikko")
    fake: dict[str, bytes] = {}

    def _get(ws_id: str) -> bytes | None:
        return fake.get(ws_id)

    def _get_or_create(ws_id: str) -> bytes:
        if ws_id not in fake:
            fake[ws_id] = secrets.token_bytes(32)
        return fake[ws_id]

    monkeypatch.setattr(workspace_key, "get", _get)
    monkeypatch.setattr(workspace_key, "get_or_create", _get_or_create)
    yield


@given(_text_strategy)
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_anonymize_then_restore_roundtrip_balanced(text: str) -> None:
    """For any text, restore(anonymize(text)) recovers the original.

    Whitespace normalisation: the masker may collapse runs of whitespace
    around inserted placeholders. We compare on the normalised form
    (single-space, stripped) — this is the contract M2 plugins rely on.
    """
    pipe = pipeline_mod.Pipeline(degraded_mode_provider=lambda: "full")
    try:
        a = pipe.anonymize(
            "ws_prop",
            text=text,
            policy_profile="balanced",
            session_id="s",
            request_id="rprop",
        )
        r = pipe.restore("ws_prop", text=a.masked_text, request_id="rprop2")
    finally:
        pipe.close()

    def _norm(s: str) -> str:
        return " ".join(s.split())

    assert _norm(r.restored_text) == _norm(text)


@given(st.text(min_size=1, max_size=500))
@settings(
    max_examples=100,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_mapping_store_roundtrip(value: str) -> None:
    """For any non-empty string, store.put → store.get returns the same value.

    The placeholder is held constant — we're testing the AES-GCM ciphertext
    column, not placeholder uniqueness. Each hypothesis example gets a
    fresh store (different workspace) so prior puts don't interfere.
    """
    ws = f"ws_propstore_{secrets.token_hex(4)}"
    store = mapping_store.MappingStore(ws)
    try:
        store.put(
            "<X_1>",
            value,
            category="PERSON",
            session_id="s",
            subject_hash="h",
        )
        assert store.get("<X_1>") == value
    finally:
        store.close()
