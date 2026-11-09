# syntax=docker/dockerfile:1

###############################################################################
# Stage 1: build
# Installs every dependency (dev included), adjusts the Prisma datasource to the
# selected provider, generates the Prisma client and compiles TypeScript.
###############################################################################
FROM oven/bun:1.4.4-alpine AS builder

ARG DB_PROVIDER=sqlite

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY docker/setup-prisma-provider.sh ./docker/setup-prisma-provider.sh

# Skip env validation during build: runtime env vars are not available yet
RUN DB_PROVIDER=${DB_PROVIDER} sh docker/setup-prisma-provider.sh && \
    SKIP_ENV_VALIDATION=true bun run prisma:generate && \
    SKIP_ENV_VALIDATION=true bun run build

###############################################################################
# Stage 2: runtime
# Production dependencies only, compiled output, generated Prisma client and the
# static dashboard. Runs as the unprivileged `bun` user (uid 1000).
###############################################################################
FROM oven/bun:1.4.4-alpine AS runtime

ARG DB_PROVIDER=sqlite
ARG DATABASE_URL="file:../database/analytics.db"
ARG REQUEST_TIMEOUT=30000
ARG NODE_TLS_REJECT_UNAUTHORIZED=1

ENV NODE_ENV=production \
    DATABASE_PROVIDER=${DB_PROVIDER} \
    DATABASE_URL=${DATABASE_URL} \
    REQUEST_TIMEOUT=${REQUEST_TIMEOUT} \
    NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED} \
    CHECKPOINT_DISABLE=1

WORKDIR /app

# Production dependencies only (peers omitted so the optional `typescript` peer of Prisma
# stays out). The Prisma CLI is a runtime dependency because
# docker-entrypoint.sh applies the schema with `prisma db push` on start-up.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --omit=peer

# Compiled app, generated Prisma client and the provider-adjusted schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Static dashboard, served by dist/index.js from ../src/dashboard-ui
COPY src/dashboard-ui ./src/dashboard-ui

# Entrypoint and CLI wrapper
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && \
    printf '#!/bin/sh\nexec bun /app/dist/merge-cli.js "$@"\n' > /usr/local/bin/merge-pdf && \
    chmod 755 /usr/local/bin/merge-pdf

# Only the state directories are writable by the app user; code stays root-owned.
# Volumes mounted here must be writable by uid 1000.
RUN mkdir -p /app/database /app/batch-storage && \
    chown -R bun:bun /app/database /app/batch-storage

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
