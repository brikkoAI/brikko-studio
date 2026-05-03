from fastapi.testclient import TestClient

from brikko_anonymizer.main import app
from brikko_anonymizer.version import __version__

client = TestClient(app)


def test_health_returns_ok() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__


def test_health_includes_scope_marker() -> None:
    resp = client.get("/health")
    body = resp.json()
    assert body["scope"] == "m0-scaffold"
    assert body["pii_pipeline"] == "disabled"


def test_unknown_route_404() -> None:
    resp = client.get("/anonymize")
    assert resp.status_code == 404
