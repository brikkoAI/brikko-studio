"""Tests for ``POST /anonymize`` (M1 Task 12).

Uses the in-process FastAPI app via :class:`httpx.ASGITransport` — no
uvicorn server needed. Workspace isolation + fake keychain come from
``conftest.py``'s autouse ``api_isolate`` fixture.
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from brikko_anonymizer.main import app


@pytest.mark.asyncio
async def test_anonymize_returns_masked_text():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_t",
                "text": "ИНН 7707083893",
                "policy_profile": "balanced",
                "session_id": "s1",
                "request_id": "r1",
            },
        )
    body = r.json()
    assert r.status_code == 200, body
    assert "<INN_1>" in body["masked_text"]
    assert "7707083893" not in body["masked_text"]
    # The INN entity must be in the response. Natasha may *also* tag the
    # word "ИНН" itself as a NAME false-positive (it's an unknown token
    # and pymorphy2 occasionally classifies all-caps unknowns as PERSON);
    # we don't make that assertion order-sensitive — the contract is that
    # *if* you sent an INN, you get an INN entity back.
    cats = {e["category"]: e for e in body["entities"]}
    assert "INN" in cats, body["entities"]
    assert cats["INN"]["placeholder"] == "<INN_1>"
    assert body["request_id"] == "r1"
    assert body["degraded_mode"] is False
    assert body["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_anonymize_validates_workspace_id_format():
    """A path-traversal-shaped workspace_id must be rejected.

    ``paths.workspace_dir`` raises ``ValueError`` on the dot-slash form;
    the handler turns that into a 400 (or FastAPI may surface 422 if
    pydantic validation lands first — accept either to keep the test
    robust against future field-validator additions).
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post(
            "/anonymize",
            json={
                "workspace_id": "../etc/passwd",
                "text": "Иванов",
                "policy_profile": "balanced",
                "session_id": "s",
                "request_id": "r1",
            },
        )
    assert r.status_code in (400, 422), r.text


@pytest.mark.asyncio
async def test_anonymize_empty_text_no_entities():
    """Empty text → empty mask + empty entities list, not an error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_e",
                "text": "",
                "policy_profile": "balanced",
                "session_id": "s",
                "request_id": "r1",
            },
        )
    body = r.json()
    assert r.status_code == 200, body
    assert body["masked_text"] == ""
    assert body["entities"] == []
