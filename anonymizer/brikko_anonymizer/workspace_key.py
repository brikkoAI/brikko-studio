"""Workspace AES-256-GCM key management via the OS keychain.

Each workspace is identified by ``workspace_id`` and gets its own random 32-byte
key, stored under service ``brikko-anonymizer`` and account ``<workspace_id>``.

The keyring stores strings, so binary keys are base64-encoded for transport.

If the OS keychain raises (headless Linux, locked-down enterprise box, CI), the
operator can opt in to a passphrase-encrypted file fallback by setting
``BRIKKO_KEY_FALLBACK=1`` — see :mod:`workspace_key_fallback`.
"""
from __future__ import annotations

import base64
import os
import secrets
from typing import Optional

import keyring as _kr  # module-level so tests can monkeypatch

from .errors import KeyringUnavailableError

SERVICE = "brikko-anonymizer"
KEY_BYTES = 32


def _fallback_enabled() -> bool:
    return os.environ.get("BRIKKO_KEY_FALLBACK") == "1"


def _decode(b64: str) -> bytes:
    return base64.b64decode(b64.encode("ascii"))


def _encode(key: bytes) -> str:
    return base64.b64encode(key).decode("ascii")


def get(workspace_id: str) -> Optional[bytes]:
    """Return the raw 32-byte key for ``workspace_id`` or ``None`` if absent.

    Raises :class:`KeyringUnavailableError` if the keychain is unreachable and
    the file fallback is not enabled.
    """
    try:
        b64 = _kr.get_password(SERVICE, workspace_id)
    except Exception as exc:  # keyring backends raise their own exception types
        if _fallback_enabled():
            from . import workspace_key_fallback as _fb  # lazy import

            return _fb.get(workspace_id)
        raise KeyringUnavailableError(f"keyring read failed: {exc}") from exc
    if b64 is None:
        return None
    return _decode(b64)


def set(workspace_id: str, key: bytes) -> None:  # noqa: A001  - stdlib name shadow is intentional public API
    """Store ``key`` (32 raw bytes) for ``workspace_id``."""
    if len(key) != KEY_BYTES:
        raise ValueError(f"key must be {KEY_BYTES} bytes, got {len(key)}")
    try:
        _kr.set_password(SERVICE, workspace_id, _encode(key))
    except Exception as exc:
        if _fallback_enabled():
            from . import workspace_key_fallback as _fb  # lazy import

            _fb.set(workspace_id, key)
            return
        raise KeyringUnavailableError(f"keyring write failed: {exc}") from exc


def delete(workspace_id: str) -> None:
    """Remove any stored key for ``workspace_id``. Idempotent."""
    try:
        _kr.delete_password(SERVICE, workspace_id)
    except Exception:
        pass  # idempotent — missing entry or backend hiccup is not fatal
    if _fallback_enabled():
        try:
            from . import workspace_key_fallback as _fb  # lazy import

            _fb.delete(workspace_id)
        except Exception:
            pass


def get_or_create(workspace_id: str) -> bytes:
    """Return the workspace key, generating + storing a fresh one if absent."""
    existing = get(workspace_id)
    if existing is not None:
        return existing
    new_key = secrets.token_bytes(KEY_BYTES)
    set(workspace_id, new_key)
    return new_key


def rotate(workspace_id: str) -> tuple[bytes, bytes]:
    """Replace the workspace key with a fresh one.

    Returns ``(old_key, new_key)``. Raises :class:`KeyError` if no key was
    stored for ``workspace_id``.
    """
    old = get(workspace_id)
    if old is None:
        raise KeyError(f"no existing key for workspace_id={workspace_id!r}")
    new = secrets.token_bytes(KEY_BYTES)
    set(workspace_id, new)
    return old, new
