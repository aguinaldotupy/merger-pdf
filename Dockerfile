FROM oven/bun:1.1.45-alpine

ENV REQUEST_TIMEOUT=30000

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

# Expor CLI helper
RUN echo '#!/bin/sh\nbun /app/dist/merge-cli.js "$@"' > /usr/local/bin/merge-pdf && \
    chmod +x /usr/local/bin/merge-pdf

EXPOSE 3000

CMD ["bun", "run", "serve"]
