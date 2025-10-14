FROM oven/bun:1.1.45-alpine

# Database provider: sqlite, postgresql, or mysql
ARG DB_PROVIDER=sqlite

ENV REQUEST_TIMEOUT=30000
ENV DATABASE_PROVIDER=${DB_PROVIDER}

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

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
