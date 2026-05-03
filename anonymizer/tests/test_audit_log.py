"""Tests for the JSONL audit log + 7d gzip + 90d retention."""
from __future__ import annotations

import datetime as dt
import gzip
import json

import pytest

from brikko_anonymizer import audit_log, paths


@pytest.fixture(autouse=True)
def _isolate_brikko_home(monkeypatch, tmp_path):
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)


def _evt(**over):
    base = {
        "workspace_id": "ws",
        "event_type": "anonymize",
        "placeholder": "<NAME_1>",
        "category": "PERSON",
        "request_id": "r1",
        "policy_profile": "balanced",
        "degraded_mode": "full",
    }
    base.update(over)
    return base


def test_write_appends_jsonl():
    audit_log.write(_evt())
    audit_log.write(_evt(event_type="restore"))
    p = paths.audit_dir() / f"{dt.date.today().isoformat()}.jsonl"
    lines = p.read_text(encoding="utf-8").strip().split("\n")
    assert len(lines) == 2
    assert json.loads(lines[0])["event_type"] == "anonymize"
    assert json.loads(lines[1])["event_type"] == "restore"


def test_event_never_contains_original_pii():
    # The audit_log.write contract: the *caller* must never put PII into the
    # event dict. This test just verifies that a "clean" event written in the
    # normal way does not accidentally drag PII through.
    audit_log.write(_evt())
    p = paths.audit_dir() / f"{dt.date.today().isoformat()}.jsonl"
    contents = p.read_text(encoding="utf-8")
    for sample in ("Иванов", "7707083893", "+79991234567", "test@example.com"):
        assert sample not in contents


def test_rotation_gzips_files_older_than_7_days():
    old_date = (dt.date.today() - dt.timedelta(days=8)).isoformat()
    p = paths.audit_dir() / f"{old_date}.jsonl"
    p.write_text(json.dumps(_evt()) + "\n", encoding="utf-8")
    audit_log.run_retention()
    assert not p.exists()
    gz = paths.audit_dir() / f"{old_date}.jsonl.gz"
    assert gz.exists()
    with gzip.open(gz, "rt", encoding="utf-8") as fh:
        line = fh.readline().strip()
    assert json.loads(line)["event_type"] == "anonymize"


def test_retention_deletes_files_older_than_90_days():
    old_date = (dt.date.today() - dt.timedelta(days=91)).isoformat()
    gz = paths.audit_dir() / f"{old_date}.jsonl.gz"
    with gzip.open(gz, "wt", encoding="utf-8") as fh:
        fh.write(json.dumps(_evt()) + "\n")
    audit_log.run_retention()
    assert not gz.exists()


def test_query_filters_by_workspace_and_category():
    for _ in range(3):
        audit_log.write(_evt(workspace_id="ws_a"))
    audit_log.write(_evt(workspace_id="ws_b"))
    events, total, next_offset = audit_log.query("ws_a")
    assert total == 3
    assert len(events) == 3
    assert next_offset is None
    assert all(e["workspace_id"] == "ws_a" for e in events)


def test_query_pagination():
    for i in range(15):
        audit_log.write(_evt(workspace_id="ws_p", request_id=f"r{i}"))
    events, total, next_offset = audit_log.query("ws_p", limit=10, offset=0)
    assert total == 15
    assert len(events) == 10
    assert next_offset == 10
    # Second page
    events2, total2, next_offset2 = audit_log.query("ws_p", limit=10, offset=10)
    assert total2 == 15
    assert len(events2) == 5
    assert next_offset2 is None
