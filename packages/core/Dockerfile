# syntax=docker/dockerfile:1.7
#
# Brikko Studio Core — multi-stage image.
#
# Stage 1 (builder): pnpm install + build oauth-client, core (studio entrypoint), web-ui.
# Stage 2 (runtime): node:22-bookworm-slim with non-root user, runs brikko-studio.mjs.
#
# Build:
#   docker build -f packages/core/Dockerfile -t brikko/studio-core:dev .
#
# Notes for soloists:
# - We `COPY . .` after the lockfile because the pnpm workspace pulls in 100+
#   extension package.json manifests (packages/core/extensions/* and
#   packages/core/packages/*). Selective COPY would break --frozen-lockfile.
#   The repo-root .dockerignore (and packages/core/.dockerignore as a fallback)
#   keep node_modules / dist / tests out of the build context.
# - --ignore-scripts is intentional: keytar/esbuild/msw native postinstalls
#   are skipped in the builder. M0 paths use the in-mem keychain fallback.

FROM node:22-bookworm-slim AS builder
WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential libsecret-1-dev pkg-config curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable

# Lockfile + workspace manifest first for max cache hit on dep changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Bring in the rest of the repo (node_modules, dist, tests excluded by .dockerignore).
COPY . .

# Frozen-lockfile install for reproducibility. Native postinstalls skipped.
RUN corepack pnpm install --frozen-lockfile --ignore-scripts

# Build oauth-client (tsc), core's studio entrypoint (tsc -p tsconfig.studio.json), web-ui (vite build).
RUN corepack pnpm --filter @brikko/oauth-client build && \
    corepack pnpm --filter @brikko/studio-core exec tsc -p tsconfig.studio.json && \
    corepack pnpm --filter @brikko/web-ui build

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsecret-1-0 ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r brikko && useradd -r -g brikko -u 1001 brikko

# Hoisted root node_modules (pnpm symlinks point inside this tree).
COPY --from=builder --chown=brikko:brikko /workspace/node_modules ./node_modules

# Per-package artifacts + their own node_modules (pnpm hoists differently than npm).
COPY --from=builder --chown=brikko:brikko /workspace/packages/oauth-client/dist ./packages/oauth-client/dist
COPY --from=builder --chown=brikko:brikko /workspace/packages/oauth-client/package.json ./packages/oauth-client/package.json
COPY --from=builder --chown=brikko:brikko /workspace/packages/oauth-client/node_modules ./packages/oauth-client/node_modules

COPY --from=builder --chown=brikko:brikko /workspace/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=brikko:brikko /workspace/packages/core/brikko-studio.mjs ./packages/core/brikko-studio.mjs
COPY --from=builder --chown=brikko:brikko /workspace/packages/core/package.json ./packages/core/package.json
COPY --from=builder --chown=brikko:brikko /workspace/packages/core/node_modules ./packages/core/node_modules

COPY --from=builder --chown=brikko:brikko /workspace/packages/web-ui/dist ./web-ui/dist

USER brikko

ENV BRIKKO_PORT=3737
ENV BRIKKO_GATEWAY=https://api.brikko.ru
ENV BRIKKO_WEB_UI_DIST=/srv/web-ui/dist
ENV NODE_ENV=production

EXPOSE 3737

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3737/api/auth/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/core/brikko-studio.mjs"]
