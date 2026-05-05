# M2 follow-ups

Items intentionally deferred from M2 — track here so they're not forgotten when
planning M3.

## Plugin

- [ ] Hot reload of policy YAML files (spec §4.11). M2 requires container
      restart. The plugin reads `BRIKKO_POLICY_PATH` and
      `BRIKKO_TOOL_POLICIES_PATH` once at boot.
- [ ] Per-field sensitivity filtering for `email.send`-style policies
      (spec §4.3 advanced). M2 implements deny / deanonymize / keep_anonymized
      at the call level only.
- [ ] Plugin-level integration test that boots actual core + actual anonymizer
      (currently we test against mocks in `packages/privacy-plugin/tests/`).

## MCP

- [ ] Bitrix24: pagination across `crm.deal.list` (we cap at `limit`, but
      Bitrix24 paginates with `start`).
- [ ] Bitrix24: support custom fields (UF_*) in deals + leads.
- [ ] 1С: support УНФ + УТ field-name variants (M2 ships with Бухгалтерия 3.0
      only).
- [ ] 1С: period-bounded balance via Turnover() OData function.
- [ ] amoCRM, Мегаплан, RetailCRM MCP servers — third-party CRMs.

## Web UI

- [ ] Virtualised message list for >1k messages (currently linear React render).
- [ ] Per-session message persistence in IndexedDB (currently lost on reload).
- [ ] Privacy dashboard "tool policies" trust-level toggle (M2 displays trust
      read-only).
- [ ] Settings: rotate-key flow (currently only initial save).
- [ ] Onboarding: skip-onboarding for power users who restored from backup.

## Integration

- [ ] Verified end-to-end against real Telegram channel adapter from upstream.
- [ ] Load test with k6 — 10 concurrent chats, measure anonymizer latency p95.
- [ ] Clean-VM smoke run on fresh Ubuntu 22.04 + Docker (Task 33 step 6 — left
      to CEO post-tag).

---

## Onboarding API gap (Tasks 27-30) — server-side

Tracker for server-side gaps that the M2 onboarding wizard depends on.
The wizard UI is fully implemented (Tasks 27-30) and calls these endpoints
optimistically — if they 404 in dev, the user lands on an error toast in the
relevant step.

## Onboarding API gap (Tasks 27-30)

The web-ui calls these endpoints; they are NOT yet implemented in `bin/brikko.js`:

| Endpoint                                  | Purpose                                            | Owner      |
| ----------------------------------------- | -------------------------------------------------- | ---------- |
| `POST /api/onboarding/create-workspace`   | Create workspace + AES-256-GCM key (M1 anonymizer) | core+anon  |
| `POST /api/onboarding/workspace/backup`   | Stream encrypted key blob to client                | core       |
| `POST /api/onboarding/llm-provider`       | Persist provider choice (Brikko OAuth or BYO key)  | core       |
| `POST /api/onboarding/disclaimer/ack`     | Write `~/.brikko/disclaimer.json`                  | core       |
| `POST /api/onboarding/finalize`           | Mark onboarding done + redirect target             | core       |

For the BYO branch, the API key must be stored via the same OS keychain
(keytar) path used for MCP creds — never plaintext on disk.

The Brikko OAuth branch reuses M0's `POST /api/auth/start` endpoint (already
implemented). The wizard performs a full-page redirect, so when the OAuth
callback lands the user can re-enter `/onboarding?step=4` directly.

## Step 5 — magic moment demo proxies

`POST /api/privacy/demo/anonymize` and `POST /api/privacy/demo/restore` are
stubbed in the UI as a synthetic round-trip (anonymize → mock LLM echo →
restore) so Step 5 does not depend on Step 3's provider config working yet.
When the real proxy lands, swap the mock LLM echo for a real call to the
configured provider — but keep the `workspace_id="demo"` ephemeral convention
so demo PII never persists in the audit log.

## Step 6 — disclaimer ack persistence

`POST /api/onboarding/disclaimer/ack` should write a JSON file with:

```json
{ "acked_at": "2026-05-05T10:00:00Z", "version": "1.0" }
```

Read this on core startup; if missing, redirect any non-`/onboarding` request
to `/onboarding`. The wizard's "Finish" button calls `ackDisclaimer()` then
`finalizeOnboarding()` then `window.location.href = "/chat"`.
