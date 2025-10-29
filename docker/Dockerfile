FROM oven/bun:1.1.45-alpine

ARG DB_PROVIDER=sqlite
ARG DATABASE_URL="file:../database/analytics.db"
ARG REQUEST_TIMEOUT=30000

ENV NODE_ENV=production
ENV DATABASE_PROVIDER=${DB_PROVIDER}
ENV REQUEST_TIMEOUT=${REQUEST_TIMEOUT}
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install --lockfile

COPY . .

# Setup Prisma provider based on DB_PROVIDER build arg
RUN chmod +x docker/setup-prisma-provider.sh && \
    DB_PROVIDER=${DB_PROVIDER} sh docker/setup-prisma-provider.sh

# Generate Prisma client with the specified provider and build
# Skip env validation during build since runtime env vars are not available yet
RUN SKIP_ENV_VALIDATION=true bun run prisma:generate && SKIP_ENV_VALIDATION=true bun run build

# Export CLI helper
RUN echo '#!/bin/sh\nbun /app/dist/merge-cli.js "$@"' > /usr/local/bin/merge-pdf && \
    chmod +x /usr/local/bin/merge-pdf

# Copy and set entrypoint
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
