"""Brikko Anonymizer M0 scaffold.

Single /health endpoint. PII detection, masking, restore, mapping store,
audit log — none of it is implemented in M0. It lands in M1.

This is intentional: the docker-compose orchestration, healthchecks,
and CI image build need a real (if empty) container to test against.
"""

from fastapi import FastAPI
from pydantic import BaseModel

from brikko_anonymizer.version import __version__

app = FastAPI(
    title="Brikko Anonymizer",
    version=__version__,
    description="M0 scaffold — /health endpoint only. PII pipeline lands in M1.",
)


class HealthResponse(BaseModel):
    status: str
    version: str
    scope: str
    pii_pipeline: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness/readiness probe used by docker-compose healthcheck and CI."""
    return HealthResponse(
        status="ok",
        version=__version__,
        scope="m0-scaffold",
        pii_pipeline="disabled",
    )
