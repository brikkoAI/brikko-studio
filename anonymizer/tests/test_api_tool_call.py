"""Tests for ``POST /tool_call/deanonymize`` (M1 Task 14).

Wraps :meth:`Pipeline.deanonymize_tool_args`. The handler honours the
loaded :class:`ToolPolicies` (bundled ``default_tool_policies.yaml``)
unless a per-request ``policy`` override is provided.

Behaviour matrix:

* trusted internal tool + listed key  -> placeholder replaced with original
* ``forbid``-policy tool             -> 403 trust_violation
* per-request override == "forbid"   -> 403 even on a trusted tool
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from brikko_anonymizer.main import app


@pytest.mark.asyncio
async def test_deanonymize_replaces_placeholders():
    """A trusted tool sees the original surface form on listed keys."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        # Seed a NAME mapping. strict profile masks NAME on balanced too,
        # but strict guarantees Natasha runs at low confidence.
        a = await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_t",
                "text": "Иванов Петр Сергеевич",
                "policy_profile": "strict",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        assert a.status_code == 200, a.text
        masked = a.json()["masked_text"]
        # Find the actual NAME placeholder so the assertion is robust to
        # Natasha's surface-form choices (full name vs. surname only).
        assert "<NAME_" in masked, masked

        # bitrix24.deals.list is in the bundled defaults with
        # mode: deanonymize, keys: [client, contact, company].
        r = await c.post(
            "/tool_call/deanonymize",
            json={
                "workspace_id": "ws_t",
                "tool_name": "bitrix24.deals.list",
                "args": {"client": "<NAME_1>", "period": "Q1"},
                "request_id": "r2",
            },
        )
    body = r.json()
    assert r.status_code == 200, body
    # Original starts with "Иванов" — Natasha may have masked the full
    # name or just the surname; either way it begins with that surface.
    assert body["args"]["client"].startswith("Иванов"), body
    assert "client" in body["deanonymized_keys"]
    # Non-PII key passes through verbatim.
    assert body["args"]["period"] == "Q1"


@pytest.mark.asyncio
async def test_deanonymize_forbids_blocked_tool():
    """A per-request ``policy=forbid`` override blocks the call with 403."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post(
            "/tool_call/deanonymize",
            json={
                "workspace_id": "ws_t",
                "tool_name": "third_party_ai.send",
                "args": {"prompt": "<NAME_1>"},
                "policy": "forbid",
                "request_id": "r1",
            },
        )
    assert r.status_code == 403, r.text
    assert r.json()["detail"]["error"] == "trust_violation"


@pytest.mark.asyncio
async def test_deanonymize_unknown_tool_forwards_masked():
    """An unregistered tool falls through to ``forward_masked`` (no replacement)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post(
            "/tool_call/deanonymize",
            json={
                "workspace_id": "ws_u",
                "tool_name": "unknown.random.tool",
                "args": {"prompt": "<NAME_1>", "n": 5},
                "request_id": "r1",
            },
        )
    body = r.json()
    assert r.status_code == 200, body
    # forward_masked: no placeholder substitution.
    assert body["args"]["prompt"] == "<NAME_1>"
    assert body["deanonymized_keys"] == []
