# Brikko Studio

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/brikkoAI/brikko-studio/releases/tag/v0.3.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-454%20passing-brightgreen.svg)](#testing)
[![GitHub stars](https://img.shields.io/github/stars/brikkoAI/brikko-studio?style=social)](https://github.com/brikkoAI/brikko-studio/stargazers)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fbrikkoai-blue.svg)](https://github.com/orgs/brikkoAI/packages?repo_name=brikko-studio)
[![152-ФЗ](https://img.shields.io/badge/152--ФЗ-compliant-success.svg)](./docs/compliance/152fz-checklist.md)

> **Часть [Brikko Privacy Ecosystem](https://brikko.ru)** — open-source инфраструктура маскинга персональных данных перед AI для русского рынка.

[🇷🇺 Русский](#русский) | [🇬🇧 English](#english)

---

## Русский

**Brikko Studio** — российский desktop AI-агент с **обратимым обезличиванием персональных данных**. Маскирует ИНН/СНИЛС/паспорта/имена перед отправкой в LLM, восстанавливает в ответе. LLM никогда не видит реальных данных. Self-hosted, MIT, ставится одной командой.

### 🎯 Зачем нужен

Российские компании по 152-ФЗ не могут отправлять персональные данные клиентов в OpenAI/Anthropic/Gemini. Brikko Studio решает это: маскирует ПД на машине пользователя **до** отправки в LLM, восстанавливает после получения ответа. Согласие субъекта ПД не требуется — данные не покидают РФ-инфраструктуру.

### ⚡ Установка одной командой

**Рекомендованный способ** (через npm CLI):

```bash
npm install -g brikko-cli
brikko init
```

Откроется браузер на `http://localhost:3737`. Дальше — 6-шаговый онбординг: workspace + backup → выбор LLM → privacy профиль → демо → подтверждение.

Управление после установки: `brikko start` / `brikko stop` / `brikko logs -f` / `brikko update` / `brikko doctor`. Подробнее — в [brikkoAI/brikko-cli](https://github.com/brikkoAI/brikko-cli).

> **Альтернатива** (для машин без Node.js):
> ```bash
> curl -sSL https://install.brikko.ru/studio.sh | bash
> ```
> Старый способ через `curl` всё ещё работает, но npm CLI — рекомендованный путь (надёжнее в РФ, обновления через `brikko update`, диагностика через `brikko doctor`).

### 🧠 Что умеет

- **6 LLM-моделей** на выбор: GPT-5.4 mini, Claude Sonnet 4.6, Gemini 3 Flash, YandexGPT, GigaChat, DeepSeek
- **Обратимое маскирование ПД**: `Иванов` → `<NAME_1>` → LLM → восстановление
- **Russian morphology**: Иванов / Иванову / Иванова → один placeholder (через Natasha NER)
- **Checksum-валидация**: ИНН (10/12), СНИЛС, ОГРН, ОГРНИП — без ложных срабатываний
- **Streaming с carry buffer**: placeholders не разрываются между chunks
- **Hallucination detection**: LLM выдумал имя — рендерится серым курсивом
- **Per-workspace SQLite + AES-256-GCM**, ключ в OS keychain
- **Audit log** JSONL, 90-day retention, gzip after 7d, **0 PII в логе**
- **Tool policies**: гранулярный контроль для tool calls (deanonymize/forbid/forward_masked)
- **MCP-серверы**: Битрикс24 + 1С Бухгалтерия 3.0 (готовая интеграция)
- **6-step onboarding wizard** с workspace backup и magic-moment демо
- **Privacy Dashboard**: stats / audit log / policy editor / purge

### 🏗 Архитектура

3 контейнера в docker-compose:

```
[Browser :3737] ─→ [Studio Core :3737] ─→ [Anonymizer :8403]
                            ↓                       ↓
                   Fork OpenClaw           FastAPI Python sidecar
                   + privacy-plugin        + 16 PII categories
                   + 6 hooks               + Natasha NER
                   + Bitrix24/1С MCP       + SQLite mapping store
                                           + Redis cache
```

### 📦 Что внутри (packages)

| Package | Описание |
|---|---|
| `@brikko/studio-core` | Форк [OpenClaw](https://github.com/openclaw/openclaw) с локализацией |
| `@brikko/oauth-client` | OAuth2 PKCE клиент к api.brikko.ru |
| `@brikko/privacy-plugin` | TS-плагин с 6 hooks для OpenClaw |
| `@brikko/skills-bitrix24` | MCP-сервер для Битрикс24 |
| `@brikko/skills-1c` | MCP-сервер для 1С: Бухгалтерия 3.0 |
| `@brikko/web-ui` | React + Vite фронтенд |
| `anonymizer/` | Python FastAPI sidecar с PII pipeline |

### 🔒 152-ФЗ compliance

| Требование | Реализация |
|---|---|
| Обезличивание при передаче третьим лицам | Pre-LLM masking |
| Аудит обработки | JSONL audit log 90d retention |
| Шифрование при хранении | SQLite + AES-256-GCM |
| Право на удаление | `POST /workspaces/{id}/purge` |
| Локализация в РФ | Self-host + Yandex/Sber LLM mode |

Полный чеклист: [docs/compliance/152fz-checklist.md](./docs/compliance/152fz-checklist.md)

### 📊 Метрики

- **77 commits** в репозитории
- **454+ автотестов** (oauth-client / privacy-plugin / skills-bitrix24 / skills-1c / web-ui / anonymizer)
- **0 регрессий** при разработке
- Latency: anonymize 1KB p50=18ms / restore p50=4ms / total overhead ~3% vs raw OpenAI

### 📚 Документация

- [QUICK_START](./docs/QUICK_START.md) — установка и первый вход
- [ARCHITECTURE](./docs/ARCHITECTURE.md) — компонентная схема
- [Anonymizer API](./anonymizer/docs/API.md) — REST endpoints
- [Plugin Architecture](./docs/plugin-architecture.md) — OpenClaw plugin contract
- [152-ФЗ Compliance](./docs/compliance/152fz-checklist.md) — соответствие 152-ФЗ

### 🐳 Docker images

```bash
docker pull ghcr.io/brikkoai/studio-core:0.3.0
docker pull ghcr.io/brikkoai/studio-anonymizer:0.3.0
```

GHCR: [github.com/orgs/brikkoAI/packages](https://github.com/orgs/brikkoAI/packages?repo_name=brikko-studio)

### 🛠 Разработка

```bash
git clone https://github.com/brikkoAI/brikko-studio
cd brikko-studio
corepack enable
pnpm install
pnpm test          # все ~232 TS теста
pnpm build         # сборка всех пакетов

cd anonymizer
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest             # 222+ Python тестов
```

### 💼 Тарифы

| Тариф | Цена | Что включено |
|---|---|---|
| **Community** (open source) | бесплатно | Self-host, все фичи v0.3.0, 100 messages/день через Gateway |
| **Pro** | 1 990 ₽/мес | Unlimited через Gateway, все 19 моделей, приоритетная поддержка |
| **Team** | 4 990 ₽/мес | Multi-user, audit reports, до 10 workspaces |
| **Enterprise** | 100к-500к ₽/год | SSO, RBAC, on-premise, compliance audits, custom MCP servers |

Подписка: [brikko.ru/pricing](https://brikko.ru/pricing)

### 🤝 Контрибьюции

Issues и PR приветствуются. Особенно интересны:
- Адверсарные примеры обхода маскирования (русский транслит, OCR-артефакты)
- Edge cases по 152-ФЗ от compliance-офицеров
- Поддержка новых LLM-провайдеров

### 🔗 Связанные продукты Brikko

| Артефакт | Установка | Аудитория |
|---|---|---|
| **brikko-studio** ★ (вы здесь) | `curl install.brikko.ru/studio.sh \| bash` | Desktop AI agent с MCP |
| [brikko-shield](https://github.com/brikkoAI/brikko-shield) | Chrome Web Store (скоро) | Маскинг в ChatGPT/Claude.ai |
| [brikko-cli](https://github.com/brikkoAI/brikko-cli) | `npm install -g brikko-cli` | CLI для Studio |
| [brikko-pii-skill](https://github.com/brikkoAI/brikko-pii-skill) | `git clone` | Skill для Claude Code/Cursor |
| [n8n-nodes-brikko](https://github.com/brikkoAI/n8n-nodes-brikko) | `npm install n8n-nodes-brikko` | Маскинг в n8n workflows |
| [presidio-ru-recognizers](https://github.com/brikkoAI/presidio-ru-recognizers) | `pip install presidio-ru-recognizers` | Python recognizers для Presidio |

### 📞 Контакты

- Сайт: [brikko.ru](https://brikko.ru)
- Telegram: [@brikko_news](https://t.me/brikko_news)
- Email: hello@brikko.ru
- Поддержка: support@brikko.ru

---

## English

**Brikko Studio** — Russian-first desktop AI agent with **reversible PII anonymization**. Masks Russian and English personal data (TINs, social IDs, names, passports) before sending to LLMs, restores it in the response. The LLM never sees real data. Self-hosted, MIT-licensed, one-line install.

### Why

Russian companies are restricted by 152-FZ data protection law from sending personal data to OpenAI/Anthropic/Gemini servers outside Russia. Brikko Studio solves this: it masks PII on the user's machine **before** the LLM call and restores it on the response. Real data never crosses the border. Same approach works for GDPR/CCPA in EU/US contexts (with English recognizers — coming in v0.4.0).

### One-line install

**Recommended** (via the npm CLI):

```bash
npm install -g brikko-cli
brikko init
```

Browser opens on `http://localhost:3737` with the 6-step onboarding.

Day-to-day management: `brikko start` / `brikko stop` / `brikko logs -f` / `brikko update` / `brikko doctor`. See [brikkoAI/brikko-cli](https://github.com/brikkoAI/brikko-cli) for the full command reference.

> **Fallback** (for machines without Node.js):
> ```bash
> curl -sSL https://install.brikko.ru/studio.sh | bash
> ```
> The legacy `curl` installer still works, but the npm CLI is the recommended path — more reliable in Russia (no CDN dependency), updates via `brikko update`, diagnostics via `brikko doctor`.

### Features

- **6 LLM providers**: GPT-5.4 mini, Claude Sonnet 4.6, Gemini 3 Flash, YandexGPT, GigaChat, DeepSeek
- **Reversible masking**: `Smith` → `<NAME_1>` → LLM → restored response
- **Russian morphology** via Natasha NER (Иванов / Иванову / Ивановым → 1 placeholder)
- **Checksum validation** for Russian IDs (TIN-10, TIN-12, SNILS, OGRN, OGRNIP)
- **Streaming** with 32-char carry buffer (placeholders don't break across chunks)
- **Hallucination detection** (LLM emits invented placeholder → grey-italic UI render)
- **Per-workspace SQLite + AES-256-GCM**, key in OS keychain
- **Audit log** JSONL with 90-day retention, gzip after 7d, **zero PII in logs**
- **Tool policies** (deanonymize / forbid / forward_masked / forward_then_remask)
- **MCP servers**: Bitrix24 + 1C Accounting (out of the box)
- **Privacy Dashboard** with stats / audit / policy editor / purge

### Architecture

3-container Docker Compose:

```
[Browser :3737] ─→ [Studio Core :3737] ─→ [Anonymizer :8403]
                          ↓                        ↓
                  OpenClaw fork            FastAPI Python sidecar
                  + privacy-plugin         + 16 PII categories
                  + 6 hooks                + Natasha NER
                  + Bitrix24/1C MCP        + SQLite mapping store
                                           + Redis cache
```

### Quick development setup

```bash
git clone https://github.com/brikkoAI/brikko-studio
cd brikko-studio
corepack enable
pnpm install
pnpm test
pnpm build

cd anonymizer
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest
```

### Pricing

| Tier | Price | Includes |
|---|---|---|
| **Community** (OSS) | Free | Self-host, all v0.3.0 features, 100 msg/day through Gateway |
| **Pro** | ₽1,990/mo (~$22) | Unlimited Gateway, all 19 models, priority support |
| **Team** | ₽4,990/mo (~$56) | Multi-user, audit reports, up to 10 workspaces |
| **Enterprise** | ₽100k-500k/year | SSO, RBAC, on-premise, custom MCP servers |

Subscribe: [brikko.ru/pricing](https://brikko.ru/pricing)

### Documentation

- [QUICK_START.md](./docs/QUICK_START.md)
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [Anonymizer API](./anonymizer/docs/API.md)
- [Plugin Architecture](./docs/plugin-architecture.md)
- [152-FZ Compliance](./docs/compliance/152fz-checklist.md) (Russian)

### Related Brikko products

| Artifact | Install | Audience |
|---|---|---|
| **brikko-studio** ★ (you are here) | `curl install.brikko.ru/studio.sh \| bash` | Desktop AI agent with MCP |
| [brikko-shield](https://github.com/brikkoAI/brikko-shield) | Chrome Web Store (soon) | PII masking in ChatGPT / Claude.ai |
| [brikko-cli](https://github.com/brikkoAI/brikko-cli) | `npm install -g brikko-cli` | CLI for Studio |
| [brikko-pii-skill](https://github.com/brikkoAI/brikko-pii-skill) | `git clone` | Skill for Claude Code / Cursor |
| [n8n-nodes-brikko](https://github.com/brikkoAI/n8n-nodes-brikko) | `npm install n8n-nodes-brikko` | PII masking inside n8n workflows |
| [presidio-ru-recognizers](https://github.com/brikkoAI/presidio-ru-recognizers) | `pip install presidio-ru-recognizers` | Russian recognizers for Presidio |

### Contributing

Issues and PRs welcome. We especially value:
- Adversarial bypass examples (transliteration, OCR artifacts, Unicode tricks)
- 152-FZ edge cases from compliance officers
- Support for new LLM providers

### Contact

- Website: [brikko.ru](https://brikko.ru)
- Telegram: [@brikko_news](https://t.me/brikko_news)
- Email: hello@brikko.ru

## License

MIT — see [LICENSE](./LICENSE).

Forked from [OpenClaw](https://github.com/openclaw/openclaw) (MIT).
See [packages/core/THIRD_PARTY_LICENSES.md](./packages/core/THIRD_PARTY_LICENSES.md) for upstream attribution.
