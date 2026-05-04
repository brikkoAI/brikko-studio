"""Tests for ``POST /restore`` (M1 Task 12).

Round-trip path: anonymize first → grab returned ``masked_text`` →
restore on the same workspace → assert original PII reappears.
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from brikko_anonymizer.main import app


@pytest.mark.asyncio
async def test_restore_roundtrip_via_anonymize():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        a = await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_r",
                "text": "ИНН 7707083893",
                "policy_profile": "balanced",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        masked = a.json()["masked_text"]

        r = await c.post(
            "/restore",
            json={
                "workspace_id": "ws_r",
                "text": masked,
                "request_id": "r2",
            },
        )
    body = r.json()
    assert r.status_code == 200, body
    assert "7707083893" in body["restored_text"]
    assert body["hallucinated"] == []
    assert body["request_id"] == "r2"
