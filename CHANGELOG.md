# Changelog

All notable changes to Brikko Studio. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning is
[SemVer](https://semver.org/).

The Studio repo ships three artefacts (Studio Core npm + Studio Anonymizer
PyPI/Docker + the Privacy Plugin npm). All are released together at the same
version tag.

## [0.3.0] — 2026-05-05 — M2 Agent Integration

### Added

- **Privacy plugin** (`@brikko/privacy-plugin`) — six pipeline hooks
  (`pre_user_message`, `post_llm_response`, `post_llm_response_stream`,
  `pre_tool_call`, `post_tool_result`, `pre_llm_call`, `pre_memory_write`)
  routed through the local Anonymizer sidecar. Profile-aware (strict /
  balanced / permissive). Streaming carry buffer (32 chars) to handle
  placeholders split across SSE chunks.
- **Bitrix24 MCP server** (`@brikko/skills-bitrix24`) — `bitrix24.deals.list`,
  `bitrix24.deals.get`, `bitrix24.contacts.search`, `bitrix24.leads.create`
  via inbound webhook. Webhook token stored in OS keychain.
- **1С MCP server** (`@brikko/skills-1c`) — `1c.documents.list`,
  `1c.contractors.search`, `1c.reports.balance` via OData. Бухгалтерия 3.0
  field names (УНФ/УТ deferred to M3).
- **Chat UI** — sessions sidebar, streaming WebSocket transport with REST
  fallback, hallucinated-placeholder rendering with "AI-generated" tooltip
  (`PlaceholderRender` component, grey-italic).
- **Privacy dashboard** (`/privacy`) — stats panel (per-category counts +
  audit volume + degraded-mode banner), paginated audit log table with
  category and since-time filters, policy editor (profile + per-category
  overrides), tool-policies editor, multi-step purge flow with two
  confirmation gates.
- **Settings** (`/settings`) — workspace info + key fingerprint + backup
  download, MCP credentials forms (Bitrix24 + 1С) with keychain-backed
  write-only storage, theme toggle (light / dark / system).
- **5-minute onboarding wizard** (`/onboarding`) — six steps:
  welcome, workspace + mandatory backup, LLM provider choice (Brikko OAuth
  or BYO key), privacy profile, magic-moment regex demo, three-touch
  disclaimer.
- **152-ФЗ operator checklist** at `docs/compliance/152fz-checklist.md`.
- **Plugin loader config** at `packages/core/plugins-config.json` declaring
  `@brikko/privacy-plugin` + the two MCP servers as untrusted.
- **End-to-end Playwright spec** (`packages/web-ui/tests/e2e/full-flow.spec.ts`)
  exercises onboarding + chat + dashboard + settings against vite preview
  with `page.route` mocks.

### Changed

- `docker-compose.yml` — adds `BRIKKO_ANONYMIZER_URL`, `BRIKKO_POLICY_PATH`,
  `BRIKKO_TOOL_POLICIES_PATH`, `BRIKKO_PLUGIN_DEBUG` envs and the
  `brikko-config` volume for operator-supplied policy YAMLs.
- `packages/core/Dockerfile` — builder stage now also builds privacy-plugin +
  skills-bitrix24 + skills-1c; runtime stage symlinks `brikko-mcp-bitrix24`
  and `brikko-mcp-1c` into `/usr/local/bin`.

### Compliance

- Audit log retention defaults to 90 days (`BRIKKO_AUDIT_RETENTION_DAYS`).
- Three-touch disclaimer persisted to `~/.brikko/disclaimer.json`.

### Out of scope (still — see `docs/M2_FOLLOWUPS.md`)

- Cloud-hosted Studio
- Mobile apps
- OCR / vision PII
- Premium recognizers (Enterprise Edition)
- Interactive MCP confirmation prompts
- amoCRM / Мегаплан / RetailCRM MCP servers
- Hot-reload of policy YAMLs
- 1С УНФ / УТ field-name variants

## [0.2.0] — M1 Anonymizer

### Added

- Anonymizer sidecar (FastAPI on `:8403`) with workspace lifecycle, AES-256-GCM
  mapping store, OS keychain key custody, Argon2id-encrypted file fallback.
- Detection pipeline: regex (ИНН / СНИЛС / phone) + Natasha NER (PERSON / ORG)
  with profile-aware confidence thresholds.
- Audit log JSONL with daily rotation + gzip compression after 24h.
- Admin API: `/stats`, `/audit`, `/purge` (full + per-subject-hash), `/policy`,
  `/tool-policies`, `/health`.
- 222+ Python tests (anonymize/restore/audit/policy/keychain).

## [0.1.0] — M0 Foundations

### Added

- OAuth + PKCE login via api.brikko.ru with `@brikko/oauth-client`.
- `docker compose up` boots Studio Core + Anonymizer scaffold + Redis.
- Welcome page + status page rendered by `@brikko/web-ui`.
- Forked OpenClaw with Brikko branding and renamed npm scope.
