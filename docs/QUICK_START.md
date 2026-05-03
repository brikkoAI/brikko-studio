# Brikko Studio — Quick Start (M0)

## 5-минутная установка

### Требования

- Docker Desktop 4.x или Docker Engine + Compose v2
- 4 GB RAM свободно
- Порты 3737, 8403, 6379 свободны
- Аккаунт на brikko.ru (зарегистрируйтесь заранее)

### Установка одной командой

```bash
curl -sSL https://install.brikko.ru/studio.sh | bash
```

Скрипт:
1. Проверит наличие Docker
2. Скачает `docker-compose.yml` в `~/brikko-studio/`
3. Спросит подтверждение перед запуском
4. Поднимет контейнеры (Core + Anonymizer + Redis)
5. Откроет браузер на `http://localhost:3737`

### Первый вход (OAuth)

1. На экране Welcome нажмите **«Войти через Brikko»**
2. Откроется brikko.ru — войдите в свой аккаунт
3. На экране согласия проверьте список scopes:
   - `chat.read` — чтение истории чатов через Gateway
   - `messages.read` — отправка/чтение сообщений
   - `embeddings.read` — генерация эмбеддингов
   - `audio.read` — транскрипция / TTS
4. Нажмите **«Разрешить»**
5. Браузер вернётся на `http://localhost:3737/status` со статусом «Вы вошли как ваш-email»

### Что работает в M0

- Полный OAuth-цикл против api.brikko.ru
- Healthcheck-эндпоинт у Anonymizer на `:8403/health`
- Welcome / Callback / Status — три экрана web UI

### Чего НЕТ в M0 (ждите M1/M2)

- PII-маскирование (Anonymizer пустой)
- Чат с LLM (только OAuth, без отправки сообщений)
- MCP-серверы (Bitrix24, 1С)
- Privacy dashboard
- Локальное хранилище маппингов

### Управление

```bash
cd ~/brikko-studio
docker compose ps         # статус сервисов
docker compose logs core  # логи
docker compose down       # остановить
docker compose up -d      # запустить
docker compose pull       # обновить образы
```

### Удаление

```bash
cd ~/brikko-studio && docker compose down -v && cd .. && rm -rf ~/brikko-studio
```

## Release procedure (maintainers only)

1. Bump versions in:
   - `package.json` (root)
   - `packages/core/package.json`
   - `packages/oauth-client/package.json`
   - `packages/web-ui/package.json`
   - `anonymizer/brikko_anonymizer/version.py`
   - `anonymizer/pyproject.toml`
2. `git commit -am "release: vX.Y.Z"`
3. `git tag vX.Y.Z`
4. `git push origin main vX.Y.Z`
5. Release workflow publishes both images to GHCR with tags `vX.Y.Z` and `latest`.
6. Verify on https://github.com/orgs/brikkoAI/packages
