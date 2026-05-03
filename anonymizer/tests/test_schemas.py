"""Validation tests for the API Pydantic schemas (M1 Task 11)."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from brikko_anonymizer import schemas


def test_anonymize_request_defaults():
    r = schemas.AnonymizeRequest(workspace_id="ws", text="hi", request_id="r")
    assert r.policy_profile == "balanced"
    assert r.session_id == "default"


def test_anonymize_request_rejects_bad_profile():
    with pytest.raises(ValidationError):
        schemas.AnonymizeRequest(
            workspace_id="ws",
            text="x",
            request_id="r",
            policy_profile="unsafe",
        )


def test_purge_request_scope_strict():
    with pytest.raises(ValidationError):
        schemas.PurgeRequest(scope="other")
