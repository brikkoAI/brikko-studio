#!/usr/bin/env bash
# Brikko Studio installer
#
# Usage:
#   curl -sSL https://install.brikko.ru/studio.sh | bash
#
# Or with options:
#   curl -sSL https://install.brikko.ru/studio.sh | bash -s -- --dir ~/brikko-studio --port 3737

set -euo pipefail

INSTALL_DIR="${HOME}/brikko-studio"
PORT="3737"
COMPOSE_URL="https://raw.githubusercontent.com/brikkoAI/brikko-studio/main/docker-compose.yml"
ENV_URL="https://raw.githubusercontent.com/brikkoAI/brikko-studio/main/.env.example"
VERSION="${BRIKKO_VERSION:-latest}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)  INSTALL_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    -h|--help)
      cat <<EOF
Brikko Studio installer

Options:
  --dir DIR       Install directory (default: \$HOME/brikko-studio)
  --port PORT     Local port for the web UI (default: 3737)
  --version VER   Image tag to pull (default: latest)
EOF
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

log()   { printf "\033[1;34m[brikko]\033[0m %s\n" "$*"; }
warn()  { printf "\033[1;33m[brikko]\033[0m %s\n" "$*" >&2; }
fatal() { printf "\033[1;31m[brikko]\033[0m %s\n" "$*" >&2; exit 1; }
hint()  { printf "\033[1;36m[brikko]\033[0m \033[2m%s\033[0m\n" "$*" >&2; }

# 1. Detect OS — distinguish WSL from native Linux for clearer guidance
OS_NAME="$(uname -s)"
case "$OS_NAME" in
  Linux*)
    if [[ -r /proc/version ]] && grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; then
      OS="wsl"
    else
      OS="linux"
    fi
    ;;
  Darwin*)  OS="macos" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows-gitbash" ;;
  *) fatal "Unsupported OS: $OS_NAME. Brikko Studio supports Linux, macOS, Windows (WSL/git-bash)." ;;
esac
log "Detected OS: $OS"

# 2. Check Docker installed
if ! command -v docker >/dev/null 2>&1; then
  case "$OS" in
    macos)
      fatal "Docker не найден. Поставь Docker Desktop: https://www.docker.com/products/docker-desktop/" ;;
    wsl|windows-gitbash)
      fatal "Docker не найден. Поставь Docker Desktop для Windows: https://www.docker.com/products/docker-desktop/
       После установки в Settings → Resources → WSL Integration включи свой дистрибутив." ;;
    linux)
      fatal "Docker не найден. На Ubuntu/Debian:
       curl -fsSL https://get.docker.com | sudo sh
       sudo usermod -aG docker \$USER  &&  newgrp docker" ;;
  esac
fi

# 3. Check Docker daemon — wait up to 60s, give actionable advice if down
if ! docker info >/dev/null 2>&1; then
  log "Docker daemon не отвечает — жду до 60 секунд (на случай если ты только что запустил Docker Desktop)…"
  for i in $(seq 1 30); do
    sleep 2
    if docker info >/dev/null 2>&1; then
      log "Docker запустился."
      break
    fi
    if [[ "$i" -eq 30 ]]; then
      echo
      case "$OS" in
        macos)
          warn "Docker Desktop не запустился. Что делать:"
          hint "  1. Открой Docker Desktop (Applications → Docker)"
          hint "  2. Дождись когда whale-icon в menu-bar перестанет анимироваться"
          hint "  3. Запусти эту команду снова: curl -sSL https://install.brikko.ru/studio.sh | bash"
          ;;
        wsl)
          warn "Docker Desktop не запущен или не интегрирован с WSL. Что делать:"
          hint "  1. На Windows открой Docker Desktop (через меню «Пуск»)"
          hint "  2. Дождись когда whale-icon в трее (внизу справа) перестанет крутиться"
          hint "  3. В Docker Desktop: Settings → Resources → WSL Integration → включи свой дистрибутив (обычно Ubuntu)"
          hint "  4. Перезапусти терминал WSL"
          hint "  5. Запусти эту команду снова: curl -sSL https://install.brikko.ru/studio.sh | bash"
          ;;
        windows-gitbash)
          warn "Docker Desktop не запущен. Что делать:"
          hint "  1. Открой Docker Desktop через меню «Пуск»"
          hint "  2. Дождись когда whale-icon в трее перестанет крутиться (зелёный кит = готов)"
          hint "  3. Запусти эту команду снова: curl -sSL https://install.brikko.ru/studio.sh | bash"
          ;;
        linux)
          warn "Docker daemon не запущен. Что делать:"
          hint "  sudo systemctl start docker"
          hint "  sudo systemctl enable docker   # чтобы запускался автоматически"
          hint "Если ты не в группе docker: sudo usermod -aG docker \$USER  &&  newgrp docker"
          ;;
      esac
      echo
      fatal "Docker недоступен. Установи и/или запусти Docker, затем повтори команду."
    fi
  done
fi
log "Docker: $(docker --version)"

# 4. Check docker compose v2
if ! docker compose version >/dev/null 2>&1; then
  case "$OS" in
    linux)
      fatal "Docker Compose v2 не найден. Поставь docker-compose-plugin:
       sudo apt-get install docker-compose-plugin   # Ubuntu/Debian
       sudo dnf install docker-compose-plugin       # Fedora/RHEL" ;;
    *)
      fatal "Docker Compose v2 не найден. Обнови Docker Desktop до последней версии — там Compose v2 встроен." ;;
  esac
fi
log "Compose: $(docker compose version --short)"

# 5. Check curl (we use it later for healthcheck)
if ! command -v curl >/dev/null 2>&1; then
  fatal "curl не найден. На Ubuntu/Debian: sudo apt-get install curl"
fi

# 6. Pre-flight summary — let user see what's about to happen
echo
log "Готов к установке:"
log "  → директория:  $INSTALL_DIR"
log "  → web-порт:    $PORT  (доступ через http://localhost:$PORT)"
log "  → version:     $VERSION"
echo

# 7. Create install dir
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 8. Download docker-compose.yml and .env.example
log "Скачиваю docker-compose.yml…"
if ! curl -fsSL "$COMPOSE_URL" -o docker-compose.yml; then
  fatal "Не удалось скачать docker-compose.yml.
       Проверь интернет: curl -v $COMPOSE_URL
       Если в РФ блокировка raw.githubusercontent.com — VPN или клонирование вручную:
       git clone https://github.com/brikkoAI/brikko-studio.git $INSTALL_DIR"
fi

if [[ ! -f .env ]]; then
  log "Скачиваю .env.example…"
  curl -fsSL "$ENV_URL" -o .env
  sed -i.bak "s/^BRIKKO_PORT=.*/BRIKKO_PORT=$PORT/" .env && rm -f .env.bak
  echo "BRIKKO_VERSION=$VERSION" >> .env
else
  log ".env уже существует — оставляю как есть"
fi

# 9. Pre-flight: port availability
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  warn "Порт $PORT уже занят. Что-то другое на нём слушает."
  hint "  Опции: 1) запустить с другим портом: --port 3838"
  hint "         2) посмотреть что занято: lsof -iTCP:$PORT"
  hint "         3) остановить процесс и повторить"
  exit 1
fi

# 10. Confirm before launching
echo
log "Brikko Studio готов к запуску."
log "После старта откроется браузер на http://localhost:$PORT"
log "где можно войти через аккаунт brikko.ru."
echo
read -r -p "Продолжить? [Y/n] " ans
ans="${ans:-Y}"
case "$ans" in
  [Yy]*) ;;
  *) log "Отменено пользователем. Запустить позже: cd $INSTALL_DIR && docker compose up -d"; exit 0 ;;
esac

# 11. Pull and start
log "Скачиваю образы (3 контейнера, ~600 MB первый раз)…"
docker compose pull
log "Запускаю сервисы…"
docker compose up -d

# 12. Wait for core to be healthy
log "Жду пока Studio Core ответит на /api/auth/status…"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/auth/status" >/dev/null 2>&1; then
    log "Studio Core готов."
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    warn "Studio Core не ответил за 60 секунд."
    hint "  Посмотри логи: cd $INSTALL_DIR && docker compose logs core"
    hint "  Напиши в @brikko_ru / hello@brikko.ru — поможем разобраться"
    exit 1
  fi
done

# 13. Open browser
URL="http://localhost:$PORT"
case "$OS" in
  macos)            open "$URL" 2>/dev/null || true ;;
  linux)            xdg-open "$URL" 2>/dev/null || true ;;
  wsl)              # WSL: открываем браузер на Windows-стороне через cmd.exe
                    cmd.exe /C start "" "$URL" 2>/dev/null || \
                    /mnt/c/Windows/System32/cmd.exe /C start "" "$URL" 2>/dev/null || true ;;
  windows-gitbash)  start "" "$URL" 2>/dev/null || cmd.exe /C start "" "$URL" 2>/dev/null || true ;;
esac

echo
log "Готово. Brikko Studio работает: $URL"
log "Управление:"
log "  cd $INSTALL_DIR"
log "  docker compose ps        # статус"
log "  docker compose logs -f   # логи"
log "  docker compose restart   # перезапуск"
log "  docker compose down      # остановка"
echo
log "Вопросы? @brikko_ru / hello@brikko.ru"
