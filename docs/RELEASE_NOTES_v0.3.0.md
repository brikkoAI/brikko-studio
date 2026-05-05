# Brikko Studio v0.3.0 — M2 Agent Integration

Released 2026-05-05.

This is the milestone that turns Brikko Studio from "scaffolding plus an
anonymizer sidecar" into a usable **AI agent for Russian businesses**. After
M2 the operator can sign in, complete a 5-minute onboarding, chat with PII
masked end-to-end, drive Bitrix24 + 1С through the LLM, and audit every
masking event from a dashboard.

## What's new

### Privacy plugin

Six OpenClaw hooks routed through the local Anonymizer:

- `pre_user_message` — anonymize before the LLM ever sees the prompt.
- `post_llm_response` (and the streaming variant) — restore real PII into the
  assistant reply, with a 32-char carry buffer so placeholders split across
  SSE chunks survive.
- `pre_tool_call` — deny-by-default unknown tools, deanonymize args for
  trusted servers, keep_anonymized for untrusted.
- `post_tool_result` — anonymize whatever the tool returned before it lands
  in the LLM context.
- `pre_llm_call` — final safety net for any text the LLM is about to see.
- `pre_memory_write` — anonymization of long-term memory entries.

Profile-aware (`strict` / `balanced` / `permissive`) with per-category
overrides via `/etc/brikko/policy.yaml`.

### Bitrix24 MCP server (`@brikko/skills-bitrix24`)

- `bitrix24.deals.list` — list deals with filters
- `bitrix24.deals.get` — single deal by id
- `bitrix24.contacts.search` — search contacts by name/email/phone
- `bitrix24.leads.create` — create a new lead

Webhook-based; token stored in OS keychain via keytar.

### 1С MCP server (`@brikko/skills-1c`)

- `1c.documents.list` — list documents (Бухгалтерия 3.0 OData)
- `1c.contractors.search` — find contractor by ИНН or name
- `1c.reports.balance` — balance for a contractor at a date

OData transport. Username + password stored in OS keychain. УНФ / УТ
variants are tracked for M3.

### Chat UI

- Sessions sidebar with persistence per browser session.
- Streaming WS transport with REST fallback.
- Hallucinated-placeholder rendering: tokens the LLM made up (e.g.
  `<EMAIL_99>` with no mapping) render as grey-italic with an
  "AI-generated" tooltip rather than leaking visibly broken text.

### Privacy dashboard

- Stats panel — counts per category, audit events last 24h, degraded-mode
  banner.
- Audit table — paginated, filterable by category and since-time.
- Policy editor — profile picker + per-category sensitivity overrides.
- Tool-policies editor — read-only trust column + args/result selectors.
- **Multi-step purge** — two confirmation gates ("Я понимаю" checkbox +
  "УДАЛИТЬ ВСЕ" phrase).

### Settings

- Workspace info + key fingerprint + backup download.
- Bitrix24 webhook + 1С OData credential forms (write-only — GET never
  returns the raw token/password, only `has_token` / `has_password`).
- Theme toggle (light / dark / system).

### 5-minute onboarding wizard

Six steps:

1. Welcome
2. Workspace creation + **mandatory backup download** (the only gate that
   blocks "Next" until acknowledged)
3. LLM provider choice — Brikko Gateway OAuth or BYO key (Anthropic /
   OpenAI / Yandex / GigaChat)
4. Privacy profile (strict / balanced / permissive)
5. Magic-moment regex demo (purely client-side — works even before the
   provider is wired)
6. Three-touch disclaimer (understand / confirm / consent)

After finalize the wizard navigates to `/chat`.

## Compliance

- 152-ФЗ operator checklist published at
  [docs/compliance/152fz-checklist.md](./compliance/152fz-checklist.md).
- Audit log retention defaults to 90 days; configurable via
  `BRIKKO_AUDIT_RETENTION_DAYS` and enforced when
  `BRIKKO_AUDIT_AUTO_PURGE=1`.

## Upgrading from M1 (v0.2.0)

```bash
docker compose down
git pull --tags && git checkout v0.3.0
docker compose up -d --build
```

Existing workspaces, mappings, and audit logs are preserved (M1 schema is
forward-compatible). Run the 6-step onboarding wizard once to ack the
disclaimer for the new disclaimer version.

## Test counts

| Package                     | Tests |
| --------------------------- | ----- |
| `@brikko/privacy-plugin`    | 69    |
| `@brikko/skills-bitrix24`   | 25    |
| `@brikko/skills-1c`         | 25    |
| `@brikko/web-ui` (vitest)   | 96    |
| `brikko-anonymizer` (pytest)| 222+  |
| **Total**                   | **~437** |

## Known gaps tracked for M3

See [docs/M2_FOLLOWUPS.md](./M2_FOLLOWUPS.md). Highlights:

- Hot-reload of policy YAML files.
- Bitrix24 deal pagination + custom field (UF_*) support.
- 1С УНФ / УТ variants + period-bounded balance via Turnover().
- amoCRM / Мегаплан / RetailCRM MCP servers.
- Virtualised chat message list for >1k messages.
- Per-session message persistence in IndexedDB.

## Out of scope

- Cloud-hosted Studio (operator must run their own Docker host)
- Mobile apps
- OCR / vision PII
- Premium recognizers (Enterprise Edition only)
- Interactive MCP confirmation prompts
