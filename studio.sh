#!/usr/bin/env bash
# Brikko Studio installer (M0)
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

# 1. Detect OS
OS_NAME="$(uname -s)"
case "$OS_NAME" in
  Linux*)   OS="linux" ;;
  Darwin*)  OS="macos" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *) fatal "Unsupported OS: $OS_NAME. Brikko Studio supports Linux, macOS, Windows (WSL/git-bash)." ;;
esac
log "Detected OS: $OS"

# 2. Check Docker
if ! command -v docker >/dev/null 2>&1; then
  fatal "Docker not found. Install Docker Desktop or Docker Engine first: https://docs.docker.com/get-docker/"
fi
if ! docker info >/dev/null 2>&1; then
  fatal "Docker daemon is not running. Start Docker and re-run this installer."
fi
log "Docker: $(docker --version)"

# 3. Check docker compose v2
if ! docker compose version >/dev/null 2>&1; then
  fatal "Docker Compose v2 not found. Install docker-compose-plugin or upgrade Docker Desktop."
fi
log "Compose: $(docker compose version --short)"

# 4. Check curl
if ! command -v curl >/dev/null 2>&1; then
  fatal "curl not found. Install curl and re-run this installer."
fi

# 5. Create install dir
log "Installing to: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 6. Download docker-compose.yml and .env.example
log "Downloading docker-compose.yml…"
curl -fsSL "$COMPOSE_URL" -o docker-compose.yml

if [[ ! -f .env ]]; then
  log "Downloading .env.example…"
  curl -fsSL "$ENV_URL" -o .env
  # patch port + version
  sed -i.bak "s/^BRIKKO_PORT=.*/BRIKKO_PORT=$PORT/" .env && rm -f .env.bak
  echo "BRIKKO_VERSION=$VERSION" >> .env
else
  log ".env already exists — leaving as is"
fi

# 7. Pre-flight: confirm port not in use
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  fatal "Port $PORT is already in use. Re-run with --port <other> or stop the conflicting service."
fi

# 8. Prompt before launching browser auth
echo
echo "Brikko Studio is ready to start. After launch, your default browser will open"
echo "  http://localhost:$PORT"
echo "where you can log in via brikko.ru."
echo
read -r -p "Continue? [Y/n] " ans
ans="${ans:-Y}"
case "$ans" in
  [Yy]*) ;;
  *) log "Aborted by user. To start later: cd $INSTALL_DIR && docker compose up -d"; exit 0 ;;
esac

# 9. Pull and start
log "Pulling images…"
docker compose pull
log "Starting services…"
docker compose up -d

# 10. Wait for core to be healthy
log "Waiting for Studio Core to become healthy…"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/auth/status" >/dev/null 2>&1; then
    log "Studio Core is up."
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    warn "Studio Core did not become healthy in 60s. Run 'docker compose logs core' to investigate."
    exit 1
  fi
done

# 11. Open browser
URL="http://localhost:$PORT"
case "$OS" in
  macos)   open "$URL" 2>/dev/null || true ;;
  linux)   xdg-open "$URL" 2>/dev/null || true ;;
  windows) start "" "$URL" 2>/dev/null || cmd.exe /C start "" "$URL" 2>/dev/null || true ;;
esac

log "Done. Brikko Studio is running at $URL"
log "Manage: cd $INSTALL_DIR && docker compose {ps|logs|down|up -d}"
