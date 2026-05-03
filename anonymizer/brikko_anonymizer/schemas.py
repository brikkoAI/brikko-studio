"""Pydantic request/response models for the anonymizer HTTP API (M1 Task 11).

Centralised so :mod:`api` (Task 12+) can ``from .schemas import ...`` and
tests can assert the shape of every endpoint without standing up FastAPI.

Field shapes mirror the Anonymizer Contract from the M1 plan §"Anonymizer
Contract" verbatim — when in doubt, that block is the source of truth.
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

PolicyProfileName = Literal["strict", "balanced", "permissive"]
ToolMode = Literal[
    "deanonymize", "forbid", "forward_masked", "forward_then_remask"
]
PurgeScope = Literal["all", "session", "subject"]


class Entity(BaseModel):
    placeholder: str
    category: str
    confidence: float


# --- /anonymize ----------------------------------------------------------


class AnonymizeRequest(BaseModel):
    workspace_id: str
    text: str
    policy_profile: PolicyProfileName = "balanced"
    session_id: str = "default"
    request_id: str


class AnonymizeResponse(BaseModel):
    masked_text: str
    entities: list[Entity]
    request_id: str
    degraded_mode: bool
    latency_ms: int


# --- /restore ------------------------------------------------------------


class RestoreRequest(BaseModel):
    workspace_id: str
    text: str
    request_id: str


class RestoreResponse(BaseModel):
    restored_text: str
    hallucinated: list[str]
    request_id: str
    latency_ms: int


# --- /tool-call ----------------------------------------------------------


class ToolCallDeanonRequest(BaseModel):
    workspace_id: str
    tool_name: str
    args: dict
    policy: Optional[ToolMode] = None
    request_id: str


class ToolCallDeanonResponse(BaseModel):
    args: dict
    deanonymized_keys: list[str]
    request_id: str


# --- /stats --------------------------------------------------------------


class StatsResponse(BaseModel):
    workspace_id: str
    categories: dict[str, int]
    total_mappings: int
    audit_events_last_24h: int
    degraded_mode: bool


# --- /audit --------------------------------------------------------------


class AuditEvent(BaseModel):
    timestamp: str
    workspace_id: str
    event_type: str
    category: str
    placeholder: str
    request_id: str
    policy_profile: str
    degraded_mode: str
    tool_name: Optional[str] = None


class AuditQueryResponse(BaseModel):
    events: list[AuditEvent]
    total: int
    next_offset: Optional[int] = None


# --- /purge --------------------------------------------------------------


class PurgeRequest(BaseModel):
    scope: PurgeScope
    session_id: Optional[str] = None
    subject_hash: Optional[str] = None


class PurgeResponse(BaseModel):
    deleted_mappings: int
    deleted_audit_events: int


__all__ = [
    "AnonymizeRequest",
    "AnonymizeResponse",
    "AuditEvent",
    "AuditQueryResponse",
    "Entity",
    "PolicyProfileName",
    "PurgeRequest",
    "PurgeResponse",
    "PurgeScope",
    "RestoreRequest",
    "RestoreResponse",
    "StatsResponse",
    "ToolCallDeanonRequest",
    "ToolCallDeanonResponse",
    "ToolMode",
]
