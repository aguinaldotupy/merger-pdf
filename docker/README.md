# Docker Configuration

This directory contains Docker configuration files for the PDF Merger API.

## Files

- **Dockerfile**: Multi-database support with build-time provider selection
- **docker-entrypoint.sh**: Automatic database migrations on container startup

## Quick Start

### Build

```bash
# From project root
docker build -f docker/Dockerfile -t merger-pdf .
```

### Run

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/prisma:/app/prisma \
  -e DATABASE_URL="file:./prisma/analytics.db" \
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
| `DATABASE_PROVIDER` | Database type (sqlite, postgresql, mysql) | sqlite |
| `DATABASE_URL` | Database connection string | file:./prisma/analytics.db |
| `ANALYTICS_API_TOKEN` | Dashboard authentication token | dev-token-change-me-in-production-min32chars |
| `REQUEST_TIMEOUT` | PDF download timeout (ms) | 30000 |
| `PORT` | Server port | 3000 |

## Automatic Migrations

The `docker-entrypoint.sh` script automatically runs database migrations on container startup using `bun run prisma:deploy`.

No manual migration steps required! 🎉

## Volume Mapping

### SQLite

**Required** - Map the database directory to persist data:

```bash
-v $(pwd)/prisma:/app/prisma
```

### PostgreSQL/MySQL

**Not required** - Data is stored in external database server.

## Health Check

Add health check to your docker-compose or run command:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Security Notes

⚠️ **Production Deployment**:

1. Change `ANALYTICS_API_TOKEN` - Generate with: `openssl rand -hex 32`
2. Use secrets management for sensitive environment variables
3. Enable HTTPS/TLS termination (use reverse proxy like nginx or Traefik)
4. Limit container resources (CPU/Memory)
5. Use read-only filesystem where possible

## Troubleshooting

### Migrations fail

Check database connection:
```bash
docker logs merger-pdf
```

### Permission denied

Ensure volume permissions are correct:
```bash
chmod 777 ./prisma
```

### Container exits immediately

Check entrypoint logs:
```bash
docker logs --tail 50 merger-pdf
```
