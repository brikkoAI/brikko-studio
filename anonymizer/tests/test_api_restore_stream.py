"""Tests for ``POST /restore_stream`` (M1 Task 13).

NDJSON request: header line + N chunk lines + end line. Response is a
streamed NDJSON: zero or more chunk events + a terminal end event.

The critical behaviour is the 32-char carry buffer: a placeholder split
across two chunks (``<IN`` then ``N_1>``) must still be replaced with the
original — never leaked verbatim, never dropped.
"""
from __future__ import annotations

import json

import pytest
from httpx import ASGITransport, AsyncClient

from brikko_anonymizer.main import app


@pytest.mark.asyncio
async def test_restore_stream_carry_buffer_works():
    """Placeholder split across chunks must round-trip via the carry buffer."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        # Seed a mapping in the workspace so <INN_1> resolves to the digits.
        await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_s",
                "text": "ИНН 7707083893",
                "policy_profile": "balanced",
                "session_id": "s",
                "request_id": "r1",
            },
        )

        # Placeholder <INN_1> split across two chunks.
        body = (
            "\n".join(
                [
                    json.dumps({"workspace_id": "ws_s", "request_id": "r2"}),
                    json.dumps({"type": "chunk", "text": "Хорошо <IN"}),
                    json.dumps({"type": "chunk", "text": "N_1>"}),
                    json.dumps({"type": "end"}),
                ]
            )
            + "\n"
        )
        r = await c.post(
            "/restore_stream",
            content=body,
            headers={"content-type": "application/x-ndjson"},
        )
    assert r.status_code == 200, r.text
    chunks = [json.loads(line) for line in r.text.strip().split("\n")]
    full = "".join(c["text"] for c in chunks if c.get("type") == "chunk")
    assert "7707083893" in full
    assert chunks[-1]["type"] == "end"
    assert chunks[-1]["hallucinated"] == []


@pytest.mark.asyncio
async def test_restore_stream_reports_hallucinations():
    """Unknown placeholders must surface in the terminal end event."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        body = (
            "\n".join(
                [
                    json.dumps({"workspace_id": "ws_h", "request_id": "r1"}),
                    # No anonymize was run for ws_h, so <NAME_999> is hallucinated.
                    json.dumps(
                        {"type": "chunk", "text": "Spotted <NAME_999> in the wild"}
                    ),
                    json.dumps({"type": "end"}),
                ]
            )
            + "\n"
        )
        r = await c.post(
            "/restore_stream",
            content=body,
            headers={"content-type": "application/x-ndjson"},
        )
    assert r.status_code == 200, r.text
    events = [json.loads(line) for line in r.text.strip().split("\n")]
    end_evt = events[-1]
    assert end_evt["type"] == "end"
    assert "<NAME_999>" in end_evt["hallucinated"]


@pytest.mark.asyncio
async def test_restore_stream_rejects_missing_header():
    """Header line missing required keys -> 400."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        body = json.dumps({"workspace_id": "ws_x"}) + "\n"  # missing request_id
        r = await c.post(
            "/restore_stream",
            content=body,
            headers={"content-type": "application/x-ndjson"},
        )
    assert r.status_code == 400, r.text


@pytest.mark.asyncio
async def test_restore_stream_implicit_end_on_eof():
    """Stream that ends without an explicit ``end`` event still terminates cleanly."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        body = (
            "\n".join(
                [
                    json.dumps({"workspace_id": "ws_e", "request_id": "r1"}),
                    json.dumps({"type": "chunk", "text": "plain text no placeholders"}),
                ]
            )
            + "\n"
        )
        r = await c.post(
            "/restore_stream",
            content=body,
            headers={"content-type": "application/x-ndjson"},
        )
    assert r.status_code == 200, r.text
    events = [json.loads(line) for line in r.text.strip().split("\n")]
    assert events[-1]["type"] == "end"
