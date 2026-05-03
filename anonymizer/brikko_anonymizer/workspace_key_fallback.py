"""Argon2id-encrypted file fallback for workspace keys.

Used when the OS keychain is unreachable AND the operator has explicitly opted
in via ``BRIKKO_KEY_FALLBACK=1``. The wrap-key (KEK) is derived from a
passphrase read from the ``BRIKKO_KEY_PASSPHRASE`` environment variable; the
passphrase NEVER touches disk.

On-disk file ``<workspace_dir>/key.enc`` layout::

    [16 B salt][12 B nonce][N B ciphertext][16 B GCM tag]

The 32-byte workspace key is encrypted with AES-256-GCM, AAD is
``workspace_id.encode()`` to bind ciphertext to its workspace identity.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from argon2.low_level import Type, hash_secret_raw
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from . import paths
from .errors import WorkspaceKeyMissingError

SALT_BYTES = 16
NONCE_BYTES = 12
KEY_BYTES = 32
GCM_TAG_BYTES = 16

# Production Argon2id parameters. Tests may monkeypatch the module-level
# constants to lower memory_cost / time_cost for speed (algorithm + file
# format remain identical).
_ARGON2_TIME_COST = 3
_ARGON2_MEMORY_COST = 64 * 1024  # 64 MiB
_ARGON2_PARALLELISM = 1


def _passphrase() -> bytes:
    pp = os.environ.get("BRIKKO_KEY_PASSPHRASE")
    if not pp:
        raise WorkspaceKeyMissingError(
            "BRIKKO_KEY_PASSPHRASE env var required when fallback is enabled"
        )
    return pp.encode("utf-8")


def _derive(passphrase: bytes, salt: bytes) -> bytes:
    return hash_secret_raw(
        secret=passphrase,
        salt=salt,
        time_cost=_ARGON2_TIME_COST,
        memory_cost=_ARGON2_MEMORY_COST,
        parallelism=_ARGON2_PARALLELISM,
        hash_len=KEY_BYTES,
        type=Type.ID,
    )


def _file_for(workspace_id: str) -> Path:
    return paths.workspace_dir(workspace_id) / "key.enc"


def get(workspace_id: str) -> Optional[bytes]:
    """Return the decrypted 32-byte workspace key, or ``None`` if no file."""
    path = _file_for(workspace_id)
    if not path.exists():
        return None
    blob = path.read_bytes()
    if len(blob) < SALT_BYTES + NONCE_BYTES + GCM_TAG_BYTES:
        raise WorkspaceKeyMissingError(f"key.enc for {workspace_id!r} is truncated")
    salt = blob[:SALT_BYTES]
    nonce = blob[SALT_BYTES : SALT_BYTES + NONCE_BYTES]
    ct = blob[SALT_BYTES + NONCE_BYTES :]
    kek = _derive(_passphrase(), salt)
    aes = AESGCM(kek)
    try:
        plaintext = aes.decrypt(nonce, ct, workspace_id.encode("utf-8"))
    except Exception as exc:
        raise WorkspaceKeyMissingError(f"decrypt failed: {exc}") from exc
    if len(plaintext) != KEY_BYTES:
        raise WorkspaceKeyMissingError(
            f"decrypted key has wrong length: {len(plaintext)} != {KEY_BYTES}"
        )
    return plaintext


def set(workspace_id: str, key: bytes) -> None:  # noqa: A001 - intentional public API
    """Encrypt and atomically write the workspace key file."""
    if len(key) != KEY_BYTES:
        raise ValueError("key must be 32 bytes")
    salt = os.urandom(SALT_BYTES)
    nonce = os.urandom(NONCE_BYTES)
    kek = _derive(_passphrase(), salt)
    aes = AESGCM(kek)
    ct = aes.encrypt(nonce, key, workspace_id.encode("utf-8"))
    final = _file_for(workspace_id)
    tmp = final.with_suffix(final.suffix + ".tmp")
    tmp.write_bytes(salt + nonce + ct)
    os.replace(tmp, final)


def delete(workspace_id: str) -> None:
    """Remove the workspace key file. Idempotent."""
    path = _file_for(workspace_id)
    try:
        path.unlink()
    except FileNotFoundError:
        pass
