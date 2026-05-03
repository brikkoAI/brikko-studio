"""Tests for the Argon2id-encrypted workspace key fallback."""
from __future__ import annotations

import secrets

import pytest

from brikko_anonymizer import paths
from brikko_anonymizer import workspace_key_fallback as wkf
from brikko_anonymizer.errors import WorkspaceKeyMissingError


@pytest.fixture(autouse=True)
def _isolated_brikko_home(monkeypatch, tmp_path):
    """Redirect paths.brikko_root to tmp_path and pre-set a known passphrase."""
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)
    monkeypatch.setenv("BRIKKO_KEY_PASSPHRASE", "correct-horse-battery-staple-2026")
    # Speed up Argon2 in tests: keep algorithm + format identical, drop memory cost.
    monkeypatch.setattr(wkf, "_ARGON2_MEMORY_COST", 8 * 1024)  # 8 MiB instead of 64 MiB
    monkeypatch.setattr(wkf, "_ARGON2_TIME_COST", 1)
    yield


def test_set_then_get_roundtrip():
    key = secrets.token_bytes(32)
    wkf.set("ws_test", key)
    assert wkf.get("ws_test") == key


def test_file_is_not_plaintext_key():
    key = secrets.token_bytes(32)
    wkf.set("ws_test", key)
    on_disk = (paths.workspace_dir("ws_test") / "key.enc").read_bytes()
    assert key not in on_disk


def test_get_missing_returns_none():
    assert wkf.get("missing") is None


def test_passphrase_change_makes_decrypt_fail(monkeypatch):
    key = secrets.token_bytes(32)
    wkf.set("ws_test", key)
    monkeypatch.setenv("BRIKKO_KEY_PASSPHRASE", "different")
    with pytest.raises(WorkspaceKeyMissingError, match="decrypt"):
        wkf.get("ws_test")


def test_missing_passphrase_raises(monkeypatch):
    key = secrets.token_bytes(32)
    wkf.set("ws_test", key)
    monkeypatch.delenv("BRIKKO_KEY_PASSPHRASE")
    with pytest.raises(WorkspaceKeyMissingError, match="(?i)passphrase"):
        wkf.get("ws_test")


def test_delete_removes_file():
    key = secrets.token_bytes(32)
    wkf.set("ws_test", key)
    wkf.delete("ws_test")
    assert wkf.get("ws_test") is None
