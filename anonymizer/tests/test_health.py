"""Smoke test for the ``/health`` liveness probe.

Updated for M1: response now carries ``degraded_mode`` (full/degraded/
emergency/unknown) instead of the M0 scaffold's ``scope`` / ``pii_pipeline``
fields. The docker-compose healthcheck and CI only assert ``status=="ok"``
so the field rename is forward-compatible.
"""
from fastapi.testclient import TestClient

from brikko_anonymizer.main import app
from brikko_anonymizer.version import __version__


def test_health_returns_ok() -> None:
    with TestClient(app) as client:
        resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__


def test_health_includes_degraded_mode() -> None:
    with TestClient(app) as client:
        resp = client.get("/health")
    body = resp.json()
    # Watcher reports one of full/degraded/emergency once lifespan is entered;
    # "unknown" is the defensive fallback if reading the watcher raises.
    assert body["degraded_mode"] in ("full", "degraded", "emergency", "unknown")


def test_unknown_route_404() -> None:
    with TestClient(app) as client:
        # GET /unknown — never registered. POST /anonymize exists in M1 so
        # GET there would be 405 (method not allowed), not 404.
        resp = client.get("/this-route-does-not-exist")
    assert resp.status_code == 404
