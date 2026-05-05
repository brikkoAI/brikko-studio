/**
 * TypeScript mirror of the Pydantic schemas in
 * `anonymizer/brikko_anonymizer/schemas.py`.
 *
 * Field names MUST match the Python side byte-for-byte (snake_case) since
 * we send/receive raw JSON to FastAPI. If the Python schemas change,
 * update this file in lockstep.
 */

export type PolicyProfileName = "strict" | "balanced" | "permissive";
export type ToolMode =
  | "deanonymize"
  | "forbid"
  | "forward_masked"
  | "forward_then_remask";
export type PurgeScope = "all" | "session" | "subject";

export interface Entity {
  placeholder: string;
  category: string;
  confidence: number;
}

// --- /anonymize -----------------------------------------------------

export interface AnonymizeRequest {
  workspace_id: string;
  text: string;
  policy_profile?: PolicyProfileName;
  session_id?: string;
  request_id: string;
}

export interface AnonymizeResponse {
  masked_text: string;
  entities: Entity[];
  request_id: string;
  degraded_mode: boolean;
  latency_ms: number;
}

// --- /restore -------------------------------------------------------

export interface RestoreRequest {
  workspace_id: string;
  text: string;
  request_id: string;
}

/**
 * Each entry is the placeholder the LLM hallucinated (no mapping exists in
 * the workspace store). Object shape (rather than bare string) leaves room
 * for the sidecar to attach `category`, `first_seen`, etc. without a
 * breaking schema change. Aligns with the chat UI's rendering shape.
 */
export interface HallucinatedEntity {
  placeholder: string;
}

export interface RestoreResponse {
  restored_text: string;
  hallucinated: HallucinatedEntity[];
  request_id: string;
  latency_ms: number;
}

// --- /tool_call/deanonymize ----------------------------------------

export interface ToolCallDeanonRequest {
  workspace_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  policy?: ToolMode;
  request_id: string;
}

export interface ToolCallDeanonResponse {
  args: Record<string, unknown>;
  deanonymized_keys: string[];
  request_id: string;
}

// --- /workspaces/{ws_id}/stats -------------------------------------

export interface StatsResponse {
  workspace_id: string;
  categories: Record<string, number>;
  total_mappings: number;
  audit_events_last_24h: number;
  degraded_mode: boolean;
}

// --- /workspaces/{ws_id}/audit -------------------------------------

export interface AuditEvent {
  timestamp: string;
  workspace_id: string;
  event_type: string;
  category: string;
  placeholder: string;
  request_id: string;
  policy_profile: string;
  degraded_mode: string;
  tool_name?: string | null;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  total: number;
  next_offset: number | null;
}

export interface AuditQueryParams {
  limit: number;
  offset: number;
  category?: string;
  since?: string;
}

// --- /workspaces/{ws_id}/purge -------------------------------------

export interface PurgeRequest {
  scope: PurgeScope;
  session_id?: string;
  subject_hash?: string;
}

export interface PurgeResponse {
  deleted_mappings: number;
  deleted_audit_events: number;
}

// --- /workspaces/{ws_id}/backup ------------------------------------

/** Raw bytes; the backup endpoint returns a binary [salt|nonce|ciphertext+tag]. */
export type BackupResponse = Uint8Array;
