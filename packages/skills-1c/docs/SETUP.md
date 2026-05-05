# 1С MCP — setup guide

This document walks an end user through enabling OData on their 1С installation
and storing credentials in the local keychain.

> **Configurations supported in M2:** 1С:Бухгалтерия 3.0.
> УНФ and УТ have different document and field names — support is tracked for M3.

## Step 1 — Enable the standard.odata HTTP service in 1С

1. Open your 1С configuration as an administrator.
2. Navigate to **Configuration → HTTP Services → standard.odata**.
3. Tick **Use** (Использовать).
4. Set the publication URL — typical: `/odata/standard.odata`.
5. Restart the 1С server / publication.

The OData root will look like:

```
https://your-1c.example.com/InfoBase/odata/standard.odata
```

## Step 2 — Create a service user in 1С

1. **Users → New user**.
2. Login: `brikko_studio`. Password: generate a strong random string.
3. Roles: **Базовые права** (read access to documents, contractors, accounting registers).
4. Untick **Show in selection list** (Показывать в списке выбора) so the user
   is hidden from regular UI.

## Step 3 — Save credentials in the OS keychain

From the Studio Settings UI: **MCP integrations → 1С → Configure**, paste
URL/username/password, click **Test connection** then **Save**.

Or via the bundled helper CLI:

```bash
cd packages/skills-1c
pnpm run build
node bin/brikko-mcp-1c-set-creds.js \
  https://your-1c.example.com/InfoBase/odata/standard.odata \
  brikko_studio \
  '<password>'
```

The credentials live in the OS keychain (Keychain on macOS, Credential Manager
on Windows, libsecret on Linux). Studio never displays them after save.

## Step 4 — Verify

```bash
cd packages/skills-1c
npx @modelcontextprotocol/inspector node bin/brikko-mcp-1c.js
```

In the inspector UI:
- Initialize handshake completes.
- `tools/list` shows 3 tools.
- `tools/call 1c.documents.list { type: "sale", limit: 5 }` returns recent sales.
- `tools/call 1c.contractors.search { name_query: "ИП" }` returns contractors.

## Tool reference

| Tool | Args | Result |
|---|---|---|
| `1c.documents.list` | `type` (sale/purchase/payment_in/payment_out, default sale), `period?` (Q1-2026 / YTD / MTD / `YYYY-MM-DD..YYYY-MM-DD`), `limit` (1–50, default 10) | `Document[]` |
| `1c.contractors.search` | `inn?` (10 or 12 digits) **or** `name_query?` (≥2 chars), `limit` | `Contractor[]` |
| `1c.reports.balance` | `period` (default YTD) | `BalanceLine[]` |

## Troubleshooting

- **HTTP 401 (`OneCAuthError`)** — wrong username/password, or the user is
  missing the OData scope. Verify the user role includes Базовые права.
- **HTTP 404 (`OneCNotFoundError`)** — your 1С configuration uses different
  field/document names. M2 ships with Бухгалтерия 3.0 names; УНФ/УТ → M3.
  File an issue with your configuration name and version.
- **Slow responses** — OData on large 1С bases can be slow. We always cap
  results at `limit`; prefer narrow date filters.
- **`OneCCredentialsMissingError`** — Settings page hasn't been saved. See Step 3.
