FROM oven/bun:1.1.45-alpine

ARG DATABASE_URL="file:../database/analytics.db"
ARG REQUEST_TIMEOUT=30000

ENV NODE_ENV=production
ENV REQUEST_TIMEOUT=${REQUEST_TIMEOUT}
ENV DATABASE_PROVIDER=${DB_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install --lockfile

COPY . .

# Generate Prisma client with the specified provider and build
RUN bun run prisma:generate && bun run build

# Export CLI helper
RUN echo '#!/bin/sh\nbun /app/dist/merge-cli.js "$@"' > /usr/local/bin/merge-pdf && \
    chmod +x /usr/local/bin/merge-pdf

# Copy and set entrypoint
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
