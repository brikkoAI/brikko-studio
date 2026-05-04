"""Tests for the four admin endpoints (M1 Task 15).

* GET  /workspaces/{ws}/stats
* GET  /workspaces/{ws}/audit
* POST /workspaces/{ws}/purge
* POST /workspaces/{ws}/backup

These are what the M2 web-ui dashboard will call. The backup endpoint
returns an Argon2id-AES-GCM encrypted zip blob containing mappings.db
plus a manifest.
"""
from __future__ import annotations

import io
import os
import zipfile

import pytest
from httpx import ASGITransport, AsyncClient

from brikko_anonymizer.main import app


@pytest.mark.asyncio
async def test_stats_after_anonymize():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_a",
                "text": "ИНН 7707083893 Иванов",
                "policy_profile": "strict",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        r = await c.get("/workspaces/ws_a/stats")
    body = r.json()
    assert r.status_code == 200, body
    assert body["total_mappings"] >= 1
    assert "INN" in body["categories"]
    assert body["workspace_id"] == "ws_a"
    assert body["degraded_mode"] is False  # stub watcher returns "full"


@pytest.mark.asyncio
async def test_audit_returns_events():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_b",
                "text": "ИНН 7707083893",
                "policy_profile": "strict",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        r = await c.get("/workspaces/ws_b/audit?limit=50")
    body = r.json()
    assert r.status_code == 200, body
    assert body["total"] >= 1
    assert body["events"][0]["event_type"] == "anonymize"
    assert body["events"][0]["workspace_id"] == "ws_b"


@pytest.mark.asyncio
async def test_purge_all_clears_mappings():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_p",
                "text": "ИНН 7707083893",
                "policy_profile": "strict",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        purge = await c.post(
            "/workspaces/ws_p/purge",
            json={"scope": "all"},
        )
        stats = await c.get("/workspaces/ws_p/stats")
    pbody = purge.json()
    sbody = stats.json()
    assert purge.status_code == 200, pbody
    assert pbody["deleted_mappings"] >= 1
    assert sbody["total_mappings"] == 0


@pytest.mark.asyncio
async def test_backup_returns_encrypted_zip():
    """End-to-end: anonymize -> /backup -> decrypt envelope -> verify zip."""
    # The Argon2id wrap uses BRIKKO_KEY_PASSPHRASE — set it for the test.
    os.environ["BRIKKO_KEY_PASSPHRASE"] = "test-passphrase-for-backup"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        await c.post(
            "/anonymize",
            json={
                "workspace_id": "ws_bk",
                "text": "ИНН 7707083893",
                "policy_profile": "strict",
                "session_id": "s",
                "request_id": "r1",
            },
        )
        r = await c.post("/workspaces/ws_bk/backup", json={})

    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/zip"
    assert r.headers["x-brikko-backup-version"] == "1"
    assert "attachment" in r.headers["content-disposition"]

    # Decrypt the envelope: [16B salt][12B nonce][ciphertext+tag]
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from brikko_anonymizer import workspace_key_fallback as wkf

    blob = r.content
    salt, nonce, ct = blob[:16], blob[16:28], blob[28:]
    kek = wkf._derive(wkf._passphrase(), salt)
    plaintext = AESGCM(kek).decrypt(nonce, ct, b"ws_bk")

    # Plaintext is a zip with mappings.db + manifest.json.
    with zipfile.ZipFile(io.BytesIO(plaintext)) as zf:
        names = zf.namelist()
    assert "mappings.db" in names
    assert "manifest.json" in names


@pytest.mark.asyncio
async def test_backup_404_when_workspace_missing():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        r = await c.post("/workspaces/ws_never_used/backup", json={})
    assert r.status_code == 404, r.text
