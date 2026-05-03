# Brikko Studio Architecture (M0 scope)

For the full design, see [Brikko Studio Design Spec](https://github.com/brikkoAI/brikko/blob/main/docs/superpowers/specs/2026-05-03-brikko-studio-design.md) (lives in the private `brikkoAI/brikko` repo).

## M0 components

```
┌─────────────────────────────────────────────────────────┐
│  User's machine (docker compose stack)                  │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────────────┐    │
│  │ web-ui (React)   │  │ Anonymizer sidecar       │    │
│  │ /, /callback,    │  │ FastAPI :8403            │    │
│  │ /status          │  │ /health (M0: stub only)  │    │
│  └────────┬─────────┘  └──────────────────────────┘    │
│           │                                             │
│           │ /api/auth/* (same-origin)                   │
│           ▼                                             │
│  ┌────────────────────────────────────────────────┐    │
│  │ Studio Core (Node.js + Fastify) :3737          │    │
│  │  - Serves web-ui static                        │    │
│  │  - /api/auth/{start,complete,status,logout}    │    │
│  │  - Embeds @brikko/oauth-client                 │    │
│  └────────┬───────────────────────────────────────┘    │
│           │                                             │
│           │ HTTPS OAuth2 PKCE                           │
│           ▼                                             │
└───────────┼─────────────────────────────────────────────┘
            │
            ▼
   https://api.brikko.ru
   /v1/oauth/{authorize,token,refresh,revoke}
```

## Packages

| Package | Lines (~M0) | Responsibility |
|---|---|---|
| `@brikko/core` | ~hundred lines (auth-api + entrypoint + i18n) on top of OpenClaw fork | Fastify server, OAuth bridge, i18n |
| `@brikko/oauth-client` | ~300 LOC | PKCE, OAuth2 client, keychain, callback server |
| `@brikko/web-ui` | ~250 LOC | React SPA: Welcome → Callback → Status |
| `anonymizer` | ~30 LOC | FastAPI scaffold with /health |

## What's deferred

| Feature | Phase |
|---|---|
| PII detection (16 categories, Natasha, regex+checksum) | M1 |
| Mapping store (SQLite + AES-256-GCM) | M1 |
| Audit log (JSONL) | M1 |
| Streaming restore | M1 |
| privacy-plugin hooks (6 hooks per spec §4.1) | M2 |
| MCP servers (Bitrix24, 1C) | M2 |
| Chat UI | M2 |
| Privacy dashboard | M2 |
| RBAC, SSO, compliance reports | Enterprise track |
