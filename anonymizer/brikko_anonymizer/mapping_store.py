"""Per-workspace encrypted SQLite mapping store.

Each workspace gets its own ``mappings.db`` under ``<workspace_dir>/`` storing
``placeholder -> AES-256-GCM(original)`` rows. The AES key comes from
:mod:`workspace_key` (OS keychain or Argon2id-encrypted file fallback).

Schema (single table + 3 indexes):

* ``placeholder``  TEXT PRIMARY KEY
* ``category``     TEXT NOT NULL          (e.g. PERSON, INN)
* ``session_id``   TEXT NOT NULL          (FastAPI request session)
* ``subject_hash`` TEXT NOT NULL          (HMAC-SHA256 of original — for purge_subject)
* ``nonce``        BLOB NOT NULL          (12 bytes, fresh per row)
* ``ciphertext``   BLOB NOT NULL          (AES-256-GCM, AAD = placeholder ASCII)
* ``created_at``   TEXT NOT NULL          (ISO-8601 UTC)

Why AAD = placeholder: GCM tag-binding the ciphertext to its placeholder means
a row cannot be transplanted under a different placeholder without the tag
rejecting on decrypt — defence-in-depth against tampering.

Why WAL + synchronous=FULL: a single sidecar process opens the DB; WAL lets the
SSE response stream read while the request handler writes. ``synchronous=FULL``
keeps durability tight enough that we don't lose mappings on power loss
(important — a missing mapping = unrecoverable response).

Concurrency: ``check_same_thread=False`` lets FastAPI's threadpool re-use the
single connection. SQLite serialises writes on its own internal mutex; the
WAL reader path is lock-free.
"""
from __future__ import annotations

import datetime as _dt
import os
import sqlite3
from typing import Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from . import paths, workspace_key
from .errors import MappingDecryptError

_NONCE_BYTES = 12

_SCHEMA = """
CREATE TABLE IF NOT EXISTS mappings (
    placeholder  TEXT PRIMARY KEY,
    category     TEXT NOT NULL,
    session_id   TEXT NOT NULL,
    subject_hash TEXT NOT NULL,
    nonce        BLOB NOT NULL,
    ciphertext   BLOB NOT NULL,
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session  ON mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_subject  ON mappings(subject_hash);
CREATE INDEX IF NOT EXISTS idx_category ON mappings(category);
"""


def _utc_now_iso() -> str:
    return _dt.datetime.now(tz=_dt.UTC).isoformat()


class MappingStore:
    """Encrypted placeholder→original store backed by SQLite + AES-256-GCM."""

    def __init__(self, workspace_id: str) -> None:
        self.workspace_id = workspace_id
        key = workspace_key.get_or_create(workspace_id)
        self._aes = AESGCM(key)
        db_path = paths.workspace_db_path(workspace_id)
        # isolation_level=None -> autocommit; we manage transactions explicitly
        # if needed. check_same_thread=False -> safe under FastAPI threadpool.
        self._conn = sqlite3.connect(
            str(db_path),
            isolation_level=None,
            check_same_thread=False,
        )
        # WAL: concurrent reads + serialised writes, no global lock for readers.
        self._conn.execute("PRAGMA journal_mode=WAL")
        # FULL: fsync after every commit; durability > raw write speed.
        self._conn.execute("PRAGMA synchronous=FULL")
        self._conn.executescript(_SCHEMA)

    # ------------------------------------------------------------------ lifecycle

    def close(self) -> None:
        """Close the underlying SQLite connection (idempotent)."""
        try:
            self._conn.close()
        except sqlite3.ProgrammingError:
            pass  # already closed

    # ---------------------------------------------------------------------- API

    def put(
        self,
        placeholder: str,
        original: str,
        *,
        category: str,
        session_id: str,
        subject_hash: str,
    ) -> None:
        """Encrypt and INSERT-OR-REPLACE a mapping row."""
        nonce = os.urandom(_NONCE_BYTES)
        ct = self._aes.encrypt(
            nonce,
            original.encode("utf-8"),
            placeholder.encode("ascii"),
        )
        self._conn.execute(
            """
            INSERT OR REPLACE INTO mappings
              (placeholder, category, session_id, subject_hash, nonce, ciphertext, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (placeholder, category, session_id, subject_hash, nonce, ct, _utc_now_iso()),
        )

    def get(self, placeholder: str) -> Optional[str]:
        """Return decrypted original or ``None`` if no row.

        Raises :class:`MappingDecryptError` on AES-GCM tag failure (e.g. the
        workspace key has rotated since the row was written).
        """
        row = self._conn.execute(
            "SELECT nonce, ciphertext FROM mappings WHERE placeholder = ?",
            (placeholder,),
        ).fetchone()
        if row is None:
            return None
        nonce, ct = row
        try:
            pt = self._aes.decrypt(nonce, ct, placeholder.encode("ascii"))
        except InvalidTag as exc:
            raise MappingDecryptError(f"placeholder={placeholder}: {exc}") from exc
        except Exception as exc:  # defensive — any other crypto failure
            raise MappingDecryptError(f"placeholder={placeholder}: {exc}") from exc
        return pt.decode("utf-8")

    def stats(self) -> dict[str, int]:
        """Return ``{category: count}`` over all rows."""
        cur = self._conn.execute(
            "SELECT category, COUNT(*) FROM mappings GROUP BY category"
        )
        return {cat: n for cat, n in cur.fetchall()}

    def total(self) -> int:
        """Return total row count."""
        (n,) = self._conn.execute("SELECT COUNT(*) FROM mappings").fetchone()
        return int(n)

    def purge(
        self,
        *,
        scope: str,
        session_id: Optional[str] = None,
        subject_hash: Optional[str] = None,
    ) -> int:
        """Delete rows; returns ``rowcount``.

        ``scope`` ∈ {"all", "session", "subject"}. Missing the relevant id for
        a non-"all" scope raises :class:`ValueError`.
        """
        if scope == "all":
            cur = self._conn.execute("DELETE FROM mappings")
        elif scope == "session":
            if session_id is None:
                raise ValueError("scope='session' requires session_id")
            cur = self._conn.execute(
                "DELETE FROM mappings WHERE session_id = ?", (session_id,)
            )
        elif scope == "subject":
            if subject_hash is None:
                raise ValueError("scope='subject' requires subject_hash")
            cur = self._conn.execute(
                "DELETE FROM mappings WHERE subject_hash = ?", (subject_hash,)
            )
        else:
            raise ValueError(f"unknown scope: {scope!r}")
        return int(cur.rowcount)
