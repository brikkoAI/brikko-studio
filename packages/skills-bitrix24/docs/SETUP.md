# Bitrix24 MCP — setup guide

This document walks an end user through one-time configuration: creating an
inbound webhook in their Bitrix24 portal and storing it in the local keychain.

## Step 1 — Create an inbound webhook in Bitrix24

1. Open your Bitrix24 portal as an administrator.
2. Navigate to **Apps → Webhooks → Add inbound webhook**.
3. Set scope: `crm` (read + write).
4. Click **Save**. Copy the URL — it looks like:

   ```
   https://your-portal.bitrix24.ru/rest/1/abc123def456/
   ```

   - `https://your-portal.bitrix24.ru` is the **portal URL**.
   - `1/abc123def456` is the **webhook token** (the path component after `/rest/`).

## Step 2 — Save credentials to the OS keychain

From the Studio Settings UI: **MCP integrations → Bitrix24 → Configure**, paste
both fields, click Save.

Or via the bundled helper CLI:

```bash
cd packages/skills-bitrix24
pnpm run build
node bin/brikko-mcp-bitrix24-set-creds.js https://your-portal.bitrix24.ru 1/abc123def456
```

The credentials live in the OS keychain (Keychain on macOS, Credential Manager
on Windows, libsecret on Linux). Studio never displays the token after saving.

## Step 3 — Verify

Run the MCP server in stdio mode and exercise it via the official inspector:

```bash
cd packages/skills-bitrix24
npx @modelcontextprotocol/inspector node bin/brikko-mcp-bitrix24.js
```

In the inspector UI:
- Initialize handshake completes.
- `tools/list` shows 4 tools: `bitrix24.deals.list`, `bitrix24.deals.get`,
  `bitrix24.contacts.search`, `bitrix24.leads.create`.
- Call `bitrix24.deals.list` with `{ "limit": 5 }` — returns your seeded deals.

## Tool reference

| Tool | Args | Result |
|---|---|---|
| `bitrix24.deals.list` | `client?` (substring), `period?` (Q1-2026 / YTD / MTD / `YYYY-MM-DD..YYYY-MM-DD`), `limit` (1–50, default 10) | `Deal[]` |
| `bitrix24.deals.get` | `deal_id` | `Deal` |
| `bitrix24.contacts.search` | `query` (≥2 chars), `limit` | `Contact[]` |
| `bitrix24.leads.create` | `title`, `contact_name`, `contact_phone?`, `contact_email?`, `source?` (default `brikko_studio`), `comments?` | `{ id }` |

## Troubleshooting

- **`AuthExpiredError` (HTTP 401)** — webhook revoked or rotated. Recreate the
  inbound webhook in Bitrix24, paste the new token in Settings.
- **`RateLimitedError` (HTTP 429)** — Bitrix24 throttled the call. Studio
  surfaces `retry_after` (seconds); the agent should wait and retry.
- **`CredentialsMissingError`** — Settings page hasn't been saved, or the
  keychain entry was deleted. See Step 2.
- **Empty `client_name` in deals** — expected. Bitrix24 returns `CONTACT_ID`
  only; resolving the human name requires an extra `crm.contact.get` call.
  The agent can do this with `bitrix24.contacts.search` if needed.
