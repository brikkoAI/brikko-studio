# syntax=docker/dockerfile:1.7
#
# Brikko Studio Anonymizer sidecar — multi-stage Python image.
#
# Stage 1 (builder): pip install --user into /root/.local.
# Stage 2 (runtime): python:3.12-slim, non-root user, uvicorn entrypoint.
#
# Build:
#   docker build -t brikko/studio-anonymizer:dev anonymizer/

FROM python:3.12-slim-bookworm AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# ---------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r brikko && useradd -r -g brikko -u 1001 brikko

# Copy /root/.local from builder, but rehome it under brikko's HOME so it's on PATH.
COPY --from=builder --chown=brikko:brikko /root/.local /home/brikko/.local
COPY --chown=brikko:brikko brikko_anonymizer ./brikko_anonymizer

# Persistent state mount point (workspace keys + mapping DBs + audit log).
# In docker-compose this dir is bound to the named ``brikko-state`` volume,
# so workspace keys + mappings survive container restarts. Owned by
# brikko:brikko so the non-root user can write without chowning the host
# volume on first boot.
RUN mkdir -p /data/.brikko && chown -R brikko:brikko /data

USER brikko
ENV PATH=/home/brikko/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    BRIKKO_HOME=/data/.brikko

EXPOSE 8403

# Healthcheck uses stdlib urllib instead of curl so we drop one apt
# package from the runtime image (smaller attack surface). The /health
# endpoint is the same one docker-compose's external healthcheck calls.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8403/health', timeout=2)" || exit 1

CMD ["uvicorn", "brikko_anonymizer.main:app", "--host", "0.0.0.0", "--port", "8403"]
