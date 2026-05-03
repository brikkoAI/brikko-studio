"""Tests for the per-workspace encrypted SQLite mapping store."""
from __future__ import annotations

import secrets
from typing import Iterator

import pytest

from brikko_anonymizer import mapping_store, paths, workspace_key
from brikko_anonymizer.errors import MappingDecryptError


@pytest.fixture(autouse=True)
def _isolate_brikko_home(monkeypatch, tmp_path):
    """Redirect brikko_root to a tmp dir and replace workspace_key with an in-memory dict.

    Each test starts with an empty key store; tests that need to swap the key
    can mutate ``_keys`` via the ``keys`` fixture below.
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
    # Expose the dict so tests can swap keys.
    monkeypatch.setattr(mapping_store, "_TEST_KEYS", keys, raising=False)


@pytest.fixture
def keys() -> dict[str, bytes]:
    """Return the in-memory keystore set up by the autouse fixture."""
    return mapping_store._TEST_KEYS  # type: ignore[attr-defined]


@pytest.fixture
def store() -> Iterator[mapping_store.MappingStore]:
    s = mapping_store.MappingStore("ws_test")
    try:
        yield s
    finally:
        s.close()


def test_put_and_get_roundtrip(store):
    store.put(
        "<NAME_1>",
        "Иванов Иван",
        category="PERSON",
        session_id="s1",
        subject_hash="h1",
    )
    assert store.get("<NAME_1>") == "Иванов Иван"


def test_disk_blob_does_not_contain_plaintext(store):
    store.put(
        "<NAME_1>",
        "СекретныйОригинал",
        category="PERSON",
        session_id="s1",
        subject_hash="h1",
    )
    store.close()  # flush WAL
    raw = paths.workspace_db_path("ws_test").read_bytes()
    assert "СекретныйОригинал".encode("utf-8") not in raw


def test_get_missing_returns_none(store):
    assert store.get("<NAME_99>") is None


def test_stats_counts_by_category(store):
    store.put("<NAME_1>", "A", category="PERSON", session_id="s1", subject_hash="h1")
    store.put("<NAME_2>", "B", category="PERSON", session_id="s1", subject_hash="h1")
    store.put("<INN_1>", "7707083893", category="INN", session_id="s1", subject_hash="h1")
    assert store.stats() == {"PERSON": 2, "INN": 1}


def test_purge_all(store):
    store.put("<NAME_1>", "A", category="PERSON", session_id="s1", subject_hash="h1")
    n = store.purge(scope="all")
    assert n == 1
    assert store.get("<NAME_1>") is None


def test_purge_session(store):
    store.put("<NAME_1>", "A", category="PERSON", session_id="s1", subject_hash="h1")
    store.put("<NAME_2>", "B", category="PERSON", session_id="s2", subject_hash="h2")
    n = store.purge(scope="session", session_id="s1")
    assert n == 1
    assert store.get("<NAME_1>") is None
    assert store.get("<NAME_2>") == "B"


def test_purge_subject(store):
    store.put("<NAME_1>", "A", category="PERSON", session_id="s1", subject_hash="h1")
    store.put("<NAME_2>", "B", category="PERSON", session_id="s1", subject_hash="h2")
    n = store.purge(scope="subject", subject_hash="h1")
    assert n == 1
    assert store.get("<NAME_1>") is None
    assert store.get("<NAME_2>") == "B"


def test_corrupt_ciphertext_raises(store, keys, monkeypatch):
    store.put(
        "<NAME_1>",
        "Иванов",
        category="PERSON",
        session_id="s1",
        subject_hash="h1",
    )
    # Swap the workspace key to a fresh random one — decrypt must fail.
    keys["ws_test"] = secrets.token_bytes(32)
    # Force the open store to refresh its AESGCM by reopening.
    store.close()
    new_store = mapping_store.MappingStore("ws_test")
    try:
        with pytest.raises(MappingDecryptError):
            new_store.get("<NAME_1>")
    finally:
        new_store.close()
