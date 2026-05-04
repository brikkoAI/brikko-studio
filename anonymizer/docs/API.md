# Brikko Anonymizer — HTTP API Reference

**Version:** `0.2.0`
**Base URL (host):** `http://127.0.0.1:8403` — bound only to loopback (see [STORAGE.md](STORAGE.md) for why)
**Base URL (compose network):** `http://anonymizer:8403` — used by sibling containers (e.g. `studio-core`)

All POST endpoints accept and return `application/json` unless noted. Every
endpoint accepts an optional `request_id` field — if you supply one, the
sidecar echoes it back in the response and includes it in every audit
event written for that request. Use it to correlate gateway logs ↔
anonymizer audit ↔ provider call traces. Treat it as opaque (UUID-style is
fine, max 128 chars).

The seven endpoints below are the **stable contract** the M2 plugin and
web-ui dashboard depend on. Field shapes match the M1 plan §"Anonymizer
Contract" verbatim — when in doubt, that block in
`docs/superpowers/plans/2026-05-03-brikko-studio-m1-anonymizer-core.md` is
the source of truth.

---

## `GET /health`

Liveness/readiness probe used by docker-compose's healthcheck and CI.

**Response 200:**
```json
{ "status": "ok", "version": "0.2.0", "degraded_mode": "full" }
```
`degraded_mode` ∈ `{full, degraded, emergency, unknown}` — see
[DEGRADED_MODE.md](DEGRADED_MODE.md).

---

## `POST /anonymize`

Replace PII in `text` with stable `<TYPE_N>` placeholders, persist the
mapping in the workspace's encrypted SQLite store.

**Request:**
```json
{
  "workspace_id": "ws_abc",
  "text": "Передай Иванову ИНН 7707083893",
  "policy_profile": "balanced",
  "session_id": "sess_42",
  "request_id": "req_uuid"
}
```

| field | type | required | notes |
|---|---|---|---|
| `workspace_id` | string | yes | `^[A-Za-z0-9_-]{1,64}$` |
| `text` | string | yes | UTF-8, no length limit at the API layer |
| `policy_profile` | enum | no | `strict` / `balanced` (default) / `permissive` |
| `session_id` | string | no | grouping for `purge --scope=session`; default `"default"` |
| `request_id` | string | yes | echoed back, written to audit |

**Response 200:**
```json
{
  "masked_text": "Передай <NAME_1> ИНН <INN_1>",
  "entities": [
    {"placeholder": "<NAME_1>", "category": "PERSON", "confidence": 0.92},
    {"placeholder": "<INN_1>",  "category": "INN",    "confidence": 1.0}
  ],
  "request_id": "req_uuid",
  "degraded_mode": false,
  "latency_ms": 23
}
```

`degraded_mode: true` means the masker ran with a reduced detector set
(see [DEGRADED_MODE.md](DEGRADED_MODE.md)). M2 surfaces this as a yellow
shield in the UI.

---

## `POST /restore`

Reverse-translate placeholders back to originals — typically applied to
the LLM's response before showing it to the user.

**Request:**
```json
{
  "workspace_id": "ws_abc",
  "text": "Хорошо, передам <NAME_1> о его ИНН <INN_1>",
  "request_id": "req_uuid"
}
```

**Response 200:**
```json
{
  "restored_text": "Хорошо, передам Иванову о его ИНН 7707083893",
  "hallucinated": [],
  "request_id": "req_uuid",
  "latency_ms": 7
}
```

`hallucinated` lists placeholders the LLM emitted that were never in the
forward mapping (e.g. `<NAME_99>`). They are left as-is in the restored
text — caller decides whether to drop the response, warn the user, or
strip them.

---

## `POST /restore_stream`

NDJSON request, NDJSON response. Use for SSE/streaming LLM responses
where you want to restore placeholders chunk-by-chunk without buffering
the whole reply.

**Request lines:**
```ndjson
{"workspace_id": "ws_abc", "request_id": "req_uuid"}
{"type": "chunk", "text": "Хорошо, передам <NAM"}
{"type": "chunk", "text": "E_1> о его..."}
{"type": "end"}
```
First line is the **header**: workspace + request_id only. Subsequent
lines are `chunk` (with `text`) or terminal `end`. Placeholders split
across chunks are buffered internally until the closing `>` arrives.

**Response lines:**
```ndjson
{"type": "chunk", "text": "Хорошо, передам "}
{"type": "chunk", "text": "Иванову о его..."}
{"type": "end", "hallucinated": []}
```

---

## `POST /tool_call/deanonymize`

Used when the agent is about to call a downstream tool (Bitrix24, Slack,
etc.) and the tool's arguments contain placeholders. The pipeline
consults the `tool_policies` registry to decide what to do:

| policy | behaviour |
|---|---|
| `deanonymize` | replace placeholders with originals before sending |
| `forbid` | reject the call → `403 trust_violation` |
| `forward_masked` | leave placeholders as-is |
| `forward_then_remask` | de-mask for the tool, then re-mask the response |

If the request body's `policy` is omitted, the registry lookup decides.

**Request:**
```json
{
  "workspace_id": "ws_abc",
  "tool_name": "bitrix24.deals.list",
  "args": {"client": "<NAME_1>", "period": "Q1-2026"},
  "policy": "deanonymize",
  "request_id": "req_uuid"
}
```

**Response 200:**
```json
{
  "args": {"client": "Иванов Иван Петрович", "period": "Q1-2026"},
  "deanonymized_keys": ["client"],
  "request_id": "req_uuid"
}
```

**Error 403:**
```json
{"error": "trust_violation", "message": "tool 'third_party_ai.send' is denied by policy"}
```

---

## `GET /workspaces/{ws_id}/stats`

Cheap workspace summary — used by the M2 dashboard's per-workspace tile.

**Response 200:**
```json
{
  "workspace_id": "ws_abc",
  "categories": {"PERSON": 47, "INN": 3, "PHONE_RU": 12},
  "total_mappings": 62,
  "audit_events_last_24h": 318,
  "degraded_mode": false
}
```

---

## `GET /workspaces/{ws_id}/audit`

Paginated audit-event read. All filter params are optional and AND-combined.

| query param | type | default |
|---|---|---|
| `limit` | int 1..1000 | 100 |
| `offset` | int ≥ 0 | 0 |
| `category` | string | (no filter) |
| `since` | ISO-8601 | (no filter) |
| `event_type` | enum | (no filter) |

**Response 200:**
```json
{
  "events": [
    {
      "timestamp": "2026-05-03T12:34:56Z",
      "event_type": "anonymize",
      "category": "PERSON",
      "placeholder": "<NAME_1>",
      "request_id": "req_uuid",
      "policy_profile": "balanced",
      "degraded_mode": "full"
    }
  ],
  "total": 4321,
  "next_offset": 100
}
```

Audit events never contain plaintext PII — only the placeholder, the
category, and metadata (timestamp, request_id, policy, degraded_mode).
This is invariant **P3** (see [STORAGE.md](STORAGE.md)).

---

## `POST /workspaces/{ws_id}/purge`

Right-to-erasure (GDPR Art. 17 / 152-ФЗ ст. 14 п. 1) — destroys
mappings AND associated audit events.

**Request — all three forms:**
```json
{"scope": "all"}
{"scope": "session", "session_id": "sess_42"}
{"scope": "subject", "subject_hash": "1a2b3c4d5e6f7890"}
```

`subject_hash` is the first 16 hex chars of `SHA-256(original)` — see the
audit/stats responses for the values currently in use.

**Response 200:**
```json
{ "deleted_mappings": 62, "deleted_audit_events": 0 }
```
`deleted_audit_events` is `0` for `scope=all` (audit retention is governed
separately — see [STORAGE.md](STORAGE.md)).

---

## `POST /workspaces/{ws_id}/backup`

Encrypted workspace backup — for operator-driven cold storage. The blob
is decryptable only with the workspace passphrase (set via
`BRIKKO_KEY_PASSPHRASE`).

**Response 200:** `application/zip`
- Headers:
  - `X-Brikko-Backup-Version: 1`
  - `Content-Disposition: attachment; filename="brikko-workspace-ws_abc-2026-05-03.zip.enc"`
- Body format: `[16 B salt][12 B nonce][N B ciphertext][16 B tag]` — ciphertext
  decrypts to a ZIP containing `mappings.db` + `manifest.json`. Restore CLI
  ships in M3.

---

## Errors

| HTTP | error code            | when                                                              |
|------|-----------------------|-------------------------------------------------------------------|
| 400  | `bad_request`         | invalid `workspace_id` format, malformed JSON                     |
| 403  | `trust_violation`     | tool call blocked by policy                                       |
| 404  | `workspace_not_found` | `/backup` on a workspace with no `mappings.db` yet                |
| 422  | `validation_error`    | Pydantic schema mismatch — see `detail` for offending field path  |
| 503  | `key_unavailable`     | OS keychain refused AND `BRIKKO_KEY_FALLBACK=0`                   |

All error responses use the shape:
```json
{"error": "<code>", "message": "<human-readable>"}
```
plus an optional `detail` field for 422s.
