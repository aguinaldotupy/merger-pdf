# Docker Configuration

This directory contains the Docker configuration for the PDF Merger API.

## Files

- **Dockerfile**: two-stage build. The `builder` stage installs all dependencies, points the Prisma datasource at the selected provider, generates the Prisma client and compiles TypeScript. The `runtime` stage contains only production dependencies, the compiled output, the generated Prisma client and the static dashboard, and runs as the unprivileged `bun` user (uid 1000).
- **docker-entrypoint.sh**: waits for external databases, applies the schema with `prisma db push` and starts the server.
- **setup-prisma-provider.sh**: rewrites the datasource provider in `prisma/schema.prisma` at build time.

## Quick Start

### Build

```bash
# From project root
docker build -f docker/Dockerfile -t merger-pdf .
```

### Run

```bash
mkdir -p database batch-storage && chown -R 1000:1000 database batch-storage

docker run -d \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/batch-storage:/app/batch-storage \
  -e ANALYTICS_API_TOKEN="$(openssl rand -hex 32)" \
  --name merger-pdf \
  merger-pdf
```

## Database Providers

### SQLite (Default)

```bash
docker build -f docker/Dockerfile -t merger-pdf .
```

### PostgreSQL

```bash
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=postgresql -t merger-pdf:postgres .
```

### MySQL

```bash
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=mysql -t merger-pdf:mysql .
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_PROVIDER` | Database type (sqlite, postgresql, mysql); set at build time from `DB_PROVIDER` | sqlite |
| `DATABASE_URL` | Database connection string (SQLite paths are relative to `/app/prisma`) | file:../database/analytics.db |
| `ANALYTICS_API_TOKEN` | Dashboard authentication token (min 32 chars) | dev-token-change-me-in-production-min32chars |
| `REQUEST_TIMEOUT` | PDF download timeout (ms) | 30000 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` to skip TLS verification on downloads (not for production) | 1 |
| `BATCH_STORAGE_PATH` | Where batch results are stored | ./batch-storage |
| `PORT` | Server port | 3000 |

## Schema on Start-up

`docker-entrypoint.sh` runs `prisma db push --skip-generate` every time the container starts, for all providers. For PostgreSQL and MySQL it first waits until the database answers. No manual migration step is required.

The Prisma CLI is therefore part of the runtime image; `CHECKPOINT_DISABLE=1` is set so it never contacts Prisma's update-check service.

## Volumes and Permissions

The process runs as uid 1000. Inside the image only `/app/database` and `/app/batch-storage` are writable; the application code and `node_modules` are root-owned and read-only for the app user. Merged PDFs returned by `POST /` go to the container's temp directory and are deleted after download.

- **SQLite**: mount `/app/database` to persist the analytics database.
- **Batch API**: mount `/app/batch-storage` to persist batch results across restarts.
- **PostgreSQL/MySQL**: no database volume is needed.

Named volumes inherit the image ownership automatically. Bind mounts on Linux hosts must be made writable by uid 1000:

```bash
chown -R 1000:1000 database batch-storage
```

Only `/tmp`, `/app/database` and `/app/batch-storage` are written at runtime, so running with `--read-only --tmpfs /tmp` plus the two volumes is a reasonable extra hardening step; verify it against your database provider before relying on it.

## Health Check

The image declares a `HEALTHCHECK` that calls `GET /health` every 30 seconds. Docker Compose and orchestrators pick it up automatically; override it with `healthcheck:` in your compose file if you need different timings.

## Security Notes

⚠️ **Production Deployment**:

1. Change `ANALYTICS_API_TOKEN` - Generate with: `openssl rand -hex 32`
2. Use secrets management for sensitive environment variables
3. Enable HTTPS/TLS termination (use a reverse proxy like nginx or Traefik)
4. Limit container resources (CPU/Memory)
5. Keep `NODE_TLS_REJECT_UNAUTHORIZED=1`

## CI

`.github/workflows/docker-build-check.yml` builds the image on every pull request that touches the Docker files, sources or dependencies, and smoke-tests the result: `/health`, non-root user, no dev tooling in `node_modules`, a CLI merge and an HTTP merge.

## Troubleshooting

### Schema push fails

Check the connection string and the logs:
```bash
docker logs merger-pdf
```

### Permission denied on `/app/database` or `/app/batch-storage`

Make the host directories writable by uid 1000 (do not use `chmod 777`):
```bash
chown -R 1000:1000 database batch-storage
```

### Container exits immediately

Check the entrypoint logs:
```bash
docker logs --tail 50 merger-pdf
```
