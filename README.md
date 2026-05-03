# Brikko Studio

[Russian](#русский) | [English](#english)

## Русский

**Brikko Studio** — российский AI-агент для desktop с reversible PII-анонимизацией. Форк OpenClaw + наш Privacy Layer.

**Статус:** M0 (Foundations) — OAuth, scaffolding, без PII-логики и чата.

### Установка

```bash
curl -sSL https://install.brikko.ru/studio.sh | bash
```

### Что работает в M0

- Логин через api.brikko.ru (OAuth + PKCE)
- Запуск Studio Core + Anonymizer scaffold + Redis через `docker compose up`
- Welcome screen + статус «Logged in as <email>»

### Что НЕ работает в M0

PII-маскинг, чат, MCP-серверы, privacy-dashboard. Это M1/M2.

## English

**Brikko Studio** — Russian AI agent for desktop with reversible PII anonymization. Fork of OpenClaw + our Privacy Layer.

**Status:** M0 (Foundations) — OAuth, scaffolding, no PII logic, no chat yet.

### Install

```bash
curl -sSL https://install.brikko.ru/studio.sh | bash
```

### What works in M0

- Login via api.brikko.ru (OAuth + PKCE)
- `docker compose up` boots Studio Core + Anonymizer scaffold + Redis
- Welcome screen + "Logged in as <email>" status

### What does NOT work in M0

PII masking, chat, MCP servers, privacy dashboard. Those are M1/M2.

## License

MIT — see [LICENSE](./LICENSE).
