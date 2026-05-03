"""Tests for the OS-keychain-backed workspace key store."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from brikko_anonymizer import workspace_key
from brikko_anonymizer.errors import KeyringUnavailableError


@pytest.fixture
def fake_keyring():
    store: dict[tuple[str, str], str] = {}
    fake = MagicMock()
    fake.get_password = lambda s, a: store.get((s, a))
    fake.set_password = lambda s, a, v: store.__setitem__((s, a), v)
    fake.delete_password = lambda s, a: store.pop((s, a), None)
    with patch.object(workspace_key, "_kr", fake):
        yield store


def test_get_or_create_generates_when_absent(fake_keyring):
    key = workspace_key.get_or_create("ws_test")
    assert isinstance(key, bytes) and len(key) == 32
    assert ("brikko-anonymizer", "ws_test") in fake_keyring


def test_get_or_create_returns_existing(fake_keyring):
    first = workspace_key.get_or_create("ws_test")
    second = workspace_key.get_or_create("ws_test")
    assert first == second


def test_rotate_replaces_and_returns_old_new(fake_keyring):
    workspace_key.get_or_create("ws_test")
    old, new = workspace_key.rotate("ws_test")
    assert isinstance(old, bytes) and len(old) == 32
    assert isinstance(new, bytes) and len(new) == 32
    assert old != new
    assert workspace_key.get("ws_test") == new


def test_delete_removes(fake_keyring):
    workspace_key.get_or_create("ws_test")
    workspace_key.delete("ws_test")
    assert workspace_key.get("ws_test") is None


def test_get_returns_none_when_absent(fake_keyring):
    assert workspace_key.get("missing") is None


def test_keyring_unavailable_raises_on_get_or_create():
    fake = MagicMock()
    fake.get_password.side_effect = RuntimeError("no backend")
    fake.set_password.side_effect = RuntimeError("no backend")
    with patch.object(workspace_key, "_kr", fake), patch.object(
        workspace_key, "_fallback_enabled", lambda: False
    ):
        with pytest.raises(KeyringUnavailableError):
            workspace_key.get_or_create("ws_test")
