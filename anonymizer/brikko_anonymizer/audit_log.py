"""JSONL audit log with daily rotation, 7-day gzip, 90-day deletion.

Layout::

    ~/.brikko/audit/2026-05-03.jsonl       (today, plain)
    ~/.brikko/audit/2026-04-29.jsonl       (4 days old, plain)
    ~/.brikko/audit/2026-04-20.jsonl.gz    (>7 days, gzipped)
    (anything >90d removed)

**Privacy invariant:** event dicts MUST NOT carry original PII. Callers (the
``Pipeline``) record only placeholder + category + metadata. Tests
(``test_event_never_contains_original_pii``) grep the file for sample
originals to enforce this contract.

Concurrency: a module-level :class:`threading.Lock` serialises writes within
the single sidecar process. Cross-process exclusion is not needed — the
sidecar runs as a singleton on each operator's box. We ``flush`` + ``fsync``
on every write so a crash mid-day loses at most the in-flight line.

``run_retention`` is invoked once at FastAPI startup and (in M2) by a
background scheduler.
"""
from __future__ import annotations

import datetime as _dt
import gzip
import json
import os
import shutil
import threading
from pathlib import Path
from typing import Optional

from . import paths

GZIP_AFTER_DAYS = 7
DELETE_AFTER_DAYS = 90

_lock = threading.Lock()


def _today_iso() -> str:
    return _dt.date.today().isoformat()


def _utc_now_iso() -> str:
    return _dt.datetime.now(tz=_dt.UTC).isoformat()


def write(event: dict) -> None:
    """Append a single event to today's JSONL file.

    Adds ``timestamp`` (UTC ISO-8601) if missing. Caller MUST NOT include
    original PII in the dict.
    """
    if "timestamp" not in event:
        event["timestamp"] = _utc_now_iso()
    line = json.dumps(event, ensure_ascii=False) + "\n"
    p = paths.audit_file_for(_today_iso())
    with _lock:
        # Open per-write — daily rotation is implicit via the date in the path.
        with open(p, "a", encoding="utf-8") as fh:
            fh.write(line)
            fh.flush()
            os.fsync(fh.fileno())


def _parse_stem_date(path: Path) -> Optional[_dt.date]:
    """Return the YYYY-MM-DD date encoded in a file name, or None."""
    name = path.name
    # Strip both ``.jsonl`` and ``.jsonl.gz`` extensions.
    if name.endswith(".jsonl.gz"):
        stem = name[: -len(".jsonl.gz")]
    elif name.endswith(".jsonl"):
        stem = name[: -len(".jsonl")]
    else:
        return None
    try:
        return _dt.date.fromisoformat(stem)
    except ValueError:
        return None


def run_retention(now: Optional[_dt.datetime] = None) -> None:
    """Apply rotation + deletion policy.

    * Files >90 days old are unlinked (regardless of plain/gz).
    * Plain ``.jsonl`` files >7 days old are gzipped to ``.jsonl.gz`` (original removed).
    """
    if now is None:
        now = _dt.datetime.now(tz=_dt.UTC)
    today = now.date()
    audit = paths.audit_dir()
    for entry in audit.iterdir():
        if not entry.is_file():
            continue
        d = _parse_stem_date(entry)
        if d is None:
            continue
        age_days = (today - d).days
        if age_days > DELETE_AFTER_DAYS:
            try:
                entry.unlink()
            except FileNotFoundError:
                pass
            continue
        if age_days > GZIP_AFTER_DAYS and entry.name.endswith(".jsonl"):
            gz_path = entry.with_suffix(entry.suffix + ".gz")  # .jsonl -> .jsonl.gz
            with open(entry, "rb") as src, gzip.open(gz_path, "wb") as dst:
                shutil.copyfileobj(src, dst)
            try:
                entry.unlink()
            except FileNotFoundError:
                pass


def _open_for_read(path: Path):
    """Return a text-mode file handle for ``.jsonl`` or ``.jsonl.gz``."""
    if path.name.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, "rt", encoding="utf-8")


def query(
    workspace_id: str,
    *,
    limit: int = 100,
    offset: int = 0,
    category: Optional[str] = None,
    since: Optional[str] = None,
) -> tuple[list[dict], int, Optional[int]]:
    """Filter events by workspace + optional category + optional ``since`` timestamp.

    Returns ``(events_page, total_match, next_offset_or_None)``.

    Performance note: full-scan + JSON parse. Fine up to ~90k events
    (90 days × 1000/day) — well under a 100ms request budget. Add a SQLite
    index over the JSONL only if a power user files a perf bug.
    """
    matched: list[dict] = []
    audit = paths.audit_dir()
    if not audit.exists():
        return [], 0, None
    files = sorted(
        (p for p in audit.iterdir() if p.is_file() and _parse_stem_date(p) is not None),
        key=lambda p: _parse_stem_date(p),  # type: ignore[arg-type, return-value]
    )
    for fp in files:
        try:
            fh = _open_for_read(fp)
        except OSError:
            continue
        with fh:
            for raw in fh:
                line = raw.strip()
                if not line:
                    continue
                try:
                    evt = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if evt.get("workspace_id") != workspace_id:
                    continue
                if category is not None and evt.get("category") != category:
                    continue
                if since is not None:
                    ts = evt.get("timestamp")
                    if ts is None or ts < since:
                        continue
                matched.append(evt)
    total = len(matched)
    page = matched[offset : offset + limit]
    next_offset = offset + limit if (offset + limit) < total else None
    return page, total, next_offset
