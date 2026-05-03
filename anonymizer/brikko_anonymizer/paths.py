"""Cross-platform on-disk paths for Brikko Anonymizer.

Single source of truth for ``~/.brikko/...`` resolution.

* Linux/macOS: ``$HOME/.brikko``
* Windows:     ``%LOCALAPPDATA%\\Brikko`` (non-roaming — keys & audit must
  not roam across machines).

Override via the ``BRIKKO_HOME`` environment variable.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

_WS_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_BRIKKO_ROOT_OVERRIDE_ENV = "BRIKKO_HOME"


def brikko_root() -> Path:
    """Return the on-disk root for all Brikko local state."""
    override = os.environ.get(_BRIKKO_ROOT_OVERRIDE_ENV)
    if override:
        return Path(override)
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / "Brikko"
    return Path(os.environ["HOME"]) / ".brikko"


def _validate_ws_id(ws_id: str) -> None:
    if not _WS_ID_RE.match(ws_id):
        raise ValueError(f"invalid workspace_id: {ws_id!r}")


def workspace_dir(ws_id: str) -> Path:
    """Return (creating if needed) the per-workspace state directory."""
    _validate_ws_id(ws_id)
    p = brikko_root() / "workspaces" / ws_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def workspace_db_path(ws_id: str) -> Path:
    """Return the SQLCipher mapping DB path for a workspace."""
    return workspace_dir(ws_id) / "mappings.db"


def audit_dir() -> Path:
    """Return (creating if needed) the audit log directory."""
    p = brikko_root() / "audit"
    p.mkdir(parents=True, exist_ok=True)
    return p


def audit_file_for(date_iso: str) -> Path:
    """Return the audit JSONL file path for the given ISO date (YYYY-MM-DD)."""
    return audit_dir() / f"{date_iso}.jsonl"
