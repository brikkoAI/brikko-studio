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

USER brikko
ENV PATH=/home/brikko/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8403

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8403/health || exit 1

CMD ["uvicorn", "brikko_anonymizer.main:app", "--host", "0.0.0.0", "--port", "8403"]
