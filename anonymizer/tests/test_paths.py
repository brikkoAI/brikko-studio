"""Tests for the cross-platform paths module."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

from brikko_anonymizer import paths


def test_root_linux(monkeypatch):
    monkeypatch.delenv("BRIKKO_HOME", raising=False)
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setenv("HOME", "/home/test")
    assert paths.brikko_root() == Path("/home/test/.brikko")


def test_root_darwin(monkeypatch):
    monkeypatch.delenv("BRIKKO_HOME", raising=False)
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setenv("HOME", "/Users/test")
    assert paths.brikko_root() == Path("/Users/test/.brikko")


def test_root_windows(monkeypatch):
    monkeypatch.delenv("BRIKKO_HOME", raising=False)
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setenv("LOCALAPPDATA", "C:/Users/test/AppData/Local")
    assert paths.brikko_root() == Path("C:/Users/test/AppData/Local/Brikko")


def test_workspace_dir_creates_parents(monkeypatch, tmp_path):
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)
    out = paths.workspace_dir("ws_abc")
    assert out == fake_root / "workspaces" / "ws_abc"
    assert out.exists() and out.is_dir()


def test_audit_dir_creates_parents(monkeypatch, tmp_path):
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)
    out = paths.audit_dir()
    assert out == fake_root / "audit"
    assert out.exists() and out.is_dir()


def test_workspace_id_must_be_safe():
    with pytest.raises(ValueError, match="invalid workspace_id"):
        paths.workspace_dir("../escape")
    with pytest.raises(ValueError, match="invalid workspace_id"):
        paths.workspace_dir("ws/abc")


def test_brikko_home_env_overrides(monkeypatch):
    monkeypatch.setenv("BRIKKO_HOME", "/custom")
    monkeypatch.setattr(sys, "platform", "win32")
    assert paths.brikko_root() == Path("/custom")
