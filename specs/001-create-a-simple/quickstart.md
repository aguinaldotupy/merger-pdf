# Quickstart: PDF Download Analytics Dashboard

**Feature**: 001-create-a-simple
**Date**: 2025-01-13
**Purpose**: Development setup, deployment, and operational guide

## Important: Project Structure

**All application code lives in `src/` directory:**
- Backend analytics: `src/analytics/`
- Dashboard API routes: `src/dashboard/`
- React frontend: `src/dashboard-ui/` (nested in src/)
- Prisma schema: `prisma/` (conventional location)

This maintains consistency with the existing project structure where all source files are under `src/`.

## Prerequisites

- **Bun** 1.0+ (preferred) or **Node.js** 20+ (see constitution's runtime compatibility)
- **Git** for version control
- **TypeScript** 5.7+ (included in dependencies)
- **Basic knowledge** of Express, React, and Prisma

## Quick Start (5 minutes)

```bash
# 1. Install backend dependencies (including Prisma)
bun install
# or: npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and set ANALYTICS_API_TOKEN (see Token Generation section)

# 3. Initialize Prisma database
npx prisma migrate dev --name init
npx prisma generate

# 4. Install dashboard dependencies
cd src/dashboard-ui
bun install
# or: npm install
cd ../..

# 5. Start development servers (parallel)
# Terminal 1: Backend
bun start

# Terminal 2: Dashboard (in src/dashboard-ui/ directory)
cd src/dashboard-ui && bun run dev
```

## Detailed Setup

### 1. Backend Setup

#### Install Dependencies

Add Prisma to existing `package.json`:

```bash
bun add @prisma/client
bun add -d prisma
```

**New dependencies**:
- `@prisma/client`: Prisma client for database queries
- `prisma`: Prisma CLI for migrations and codegen

#### Initialize Prisma

```bash
# Create prisma directory and schema
npx prisma init --datasource-provider sqlite

# This creates:
# - prisma/schema.prisma
# - .env with DATABASE_URL
```

#### Configure Database

Edit `.env`:

```env
# Existing variables
PORT=3000
REQUEST_TIMEOUT=10000

# New analytics variables
DATABASE_URL="file:./prisma/analytics.db"
ANALYTICS_API_TOKEN=your-secure-token-here-min-32-chars
```

**Generate secure token**:

```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js/Bun
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Run Database Migrations

```bash
# Generate and apply initial migration
npx prisma migrate dev --name init

# Generate Prisma Client (auto-runs after migrate)
npx prisma generate

# Verify database created
ls prisma/
# Should see: analytics.db, schema.prisma, migrations/
```

### 2. Frontend Dashboard Setup

#### Initialize Dashboard Project

```bash
# Create dashboard directory
mkdir dashboard
cd dashboard

# Initialize Vite project with React + TypeScript
bun create vite . --template react-ts
# or: npm create vite@latest . -- --template react-ts

# Install dependencies
bun install
```

#### Configure Vite

Edit `dashboard/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
```

#### Dashboard Package.json Scripts

Add to `dashboard/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "biome check --write"
  }
}
```

### 3. Development Workflow

#### Start Backend (Terminal 1)

```bash
# From project root
bun start
# or: npm start

# Server runs on http://localhost:3000
# Endpoints:
# - POST / (existing PDF merge)
# - GET /health (existing health check)
# - GET /api/analytics/* (new analytics endpoints)
# - GET /dashboard (new dashboard page)
```

#### Start Frontend (Terminal 2)

```bash
# From dashboard directory
cd dashboard
bun run dev
# or: npm run dev

# Dev server runs on http://localhost:5173
# Hot reload enabled
# API requests proxied to :3000
```

#### Verify Setup

1. **Backend health check**:
   ```bash
   curl http://localhost:3000/health
   # Expected: Server status OK
   ```

2. **Database connection**:
   ```bash
   npx prisma studio
   # Opens browser to http://localhost:5555
   # Verify DownloadEvent table exists
   ```

3. **Dashboard access**:
   ```bash
   # Open in browser: http://localhost:5173
   # Enter ANALYTICS_API_TOKEN when prompted
   # Should see dashboard with zero data
   ```

4. **Record test event**:
   ```bash
   # Trigger PDF merge to generate analytics
   curl -X POST http://localhost:3000/ \
     -H "Content-Type: application/json" \
     -d '{
       "title": "test",
       "sources": ["https://example.com/test.pdf"]
     }'

   # Check dashboard - should show 1 event
   ```

## Production Deployment

### Build Process

#### 1. Build Frontend

```bash
cd dashboard
bun run build
# or: npm run build

# Creates dashboard/dist/ with optimized bundle
cd ..
```

#### 2. Build Backend

```bash
bun run build
# or: npm run build

# Compiles TypeScript to dist/
```

#### 3. Serve Dashboard from Express

Add to `src/index.ts`:

```typescript
import express from 'express';
import path from 'path';

const app = express();

// Serve dashboard static files
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));

// Fallback for React Router (if added later)
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

// Existing routes...
```

### Environment Configuration

Create `.env.production`:

```env
# Server
PORT=3000
NODE_ENV=production

# PDF Merge
REQUEST_TIMEOUT=10000

# Analytics
DATABASE_URL="file:./prisma/analytics.db"
ANALYTICS_API_TOKEN=your-production-token-here-64-chars-minimum

# Logging (optional)
LOG_LEVEL=info
```

### Database Migrations (Production)

```bash
# Run migrations (doesn't recreate database)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Docker Deployment

Update `Dockerfile`:

```dockerfile
FROM oven/bun:1.1.45-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY dashboard/package.json ./dashboard/

# Install dependencies
RUN bun install

# Install dashboard dependencies and build
WORKDIR /app/dashboard
RUN bun install && bun run build

# Back to root
WORKDIR /app

# Copy source code
COPY . .

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build backend
RUN bun run build

# Expose ports
EXPOSE 3000

# Run migrations and start server
CMD npx prisma migrate deploy && bun run serve
```

Build and run:

```bash
# Build image
docker build -t merger-pdf-analytics .

# Run container
docker run -d \
  -p 3000:3000 \
  -e ANALYTICS_API_TOKEN=your-token \
  -v $(pwd)/prisma:/app/prisma \
  --name merger-pdf \
  merger-pdf-analytics
```

### Health Checks

Add health check endpoint:

```typescript
app.get('/api/analytics/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});
```

## Common Tasks

### View Database

```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Browse to http://localhost:5555
# View/edit DownloadEvent records
```

### Query Analytics from CLI

```bash
# Using curl with authentication
TOKEN="your-api-token-here"

# Get overview
curl -H "X-API-Token: $TOKEN" http://localhost:3000/api/analytics/overview | jq

# Get top URLs
curl -H "X-API-Token: $TOKEN" "http://localhost:3000/api/analytics/top-urls?limit=10" | jq

# Get recent errors
curl -H "X-API-Token: $TOKEN" "http://localhost:3000/api/analytics/errors?limit=20" | jq
```

### Database Backup

```bash
# Backup SQLite file
cp prisma/analytics.db prisma/analytics.db.backup-$(date +%Y%m%d)

# Restore from backup
cp prisma/analytics.db.backup-20250113 prisma/analytics.db
```

### Database Maintenance

```bash
# Analyze query planner (improves performance)
sqlite3 prisma/analytics.db "ANALYZE;"

# Reclaim disk space (after deletions)
sqlite3 prisma/analytics.db "VACUUM;"

# Check database integrity
sqlite3 prisma/analytics.db "PRAGMA integrity_check;"

# View database size
ls -lh prisma/analytics.db
```

### Rotate API Token

```bash
# 1. Generate new token
NEW_TOKEN=$(openssl rand -hex 32)
echo "New token: $NEW_TOKEN"

# 2. Update .env
sed -i '' "s/ANALYTICS_API_TOKEN=.*/ANALYTICS_API_TOKEN=$NEW_TOKEN/" .env

# 3. Restart server
# Bun
bun run serve

# Docker
docker restart merger-pdf

# 4. Distribute new token to administrators
```

## Troubleshooting

### Issue: Prisma Client Not Found

**Symptom**: `Error: Cannot find module '@prisma/client'`

**Solution**:
```bash
# Regenerate Prisma Client
npx prisma generate

# Or reinstall
bun install @prisma/client
```

### Issue: Dashboard 401 Unauthorized

**Symptom**: Dashboard shows authentication error

**Solutions**:
1. Check `ANALYTICS_API_TOKEN` set in `.env`
2. Verify token matches in frontend and backend
3. Check browser console for correct header
4. Clear browser cache/cookies

### Issue: Database Locked

**Symptom**: `Error: database is locked`

**Solutions**:
1. Enable WAL mode:
   ```bash
   sqlite3 prisma/analytics.db "PRAGMA journal_mode=WAL;"
   ```
2. Check for long-running queries
3. Verify only one process accessing database

### Issue: Slow Dashboard Loading

**Symptom**: Dashboard takes > 5 seconds to load

**Solutions**:
1. Check database size: `ls -lh prisma/analytics.db`
2. Run ANALYZE: `sqlite3 prisma/analytics.db "ANALYZE;"`
3. Add indexes (see data-model.md)
4. Implement data retention policy

### Issue: Analytics Not Recording

**Symptom**: Download events not appearing in dashboard

**Debugging**:
1. Check server logs for errors
2. Verify middleware registered:
   ```typescript
   app.use(analyticsMiddleware);
   ```
3. Test direct event recording:
   ```bash
   curl -X POST http://localhost:3000/api/analytics/event \
     -H "Content-Type: application/json" \
     -d '{"url":"test","statusCode":200}'
   ```
4. Check Prisma Studio for events: `npx prisma studio`

### Issue: CORS Errors in Dashboard

**Symptom**: Browser console shows CORS errors

**Solution** (should not occur with same-origin):
```typescript
// Only if dashboard on different domain
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## Performance Optimization

### Backend

1. **Enable SQLite WAL mode** (better concurrency):
   ```bash
   sqlite3 prisma/analytics.db "PRAGMA journal_mode=WAL;"
   ```

2. **Connection pooling** (already enabled in Prisma):
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Async analytics recording**:
   ```typescript
   // Don't await analytics in request handler
   recordEvent(data).catch(console.error);
   res.send(pdfBuffer);
   ```

### Frontend

1. **Lazy loading**:
   ```typescript
   const StatsOverview = lazy(() => import('./components/StatsOverview'));
   ```

2. **Debounced refresh**:
   ```typescript
   const debouncedRefresh = debounce(() => fetchAnalytics(), 1000);
   ```

3. **Memoization**:
   ```typescript
   const sortedUrls = useMemo(() =>
     urls.sort((a, b) => b.accessCount - a.accessCount),
     [urls]
   );
   ```

## Testing

### Manual Testing Checklist

- [ ] PDF merge creates download event
- [ ] Dashboard displays correct counts
- [ ] Status code categorization accurate
- [ ] Top URLs ranked correctly
- [ ] Error tracking shows failures
- [ ] Authentication blocks unauthenticated access
- [ ] Authentication allows valid token
- [ ] Dashboard auto-refreshes (if implemented)
- [ ] Works on both Bun and Node.js
- [ ] Database persists across server restarts

### Integration Tests (Optional)

Create `tests/integration/analytics.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { PrismaClient } from '@prisma/client';

describe('Analytics Integration', () => {
  const prisma = new PrismaClient();

  it('records download event', async () => {
    const event = await prisma.downloadEvent.create({
      data: {
        url: 'https://test.com/file.pdf',
        statusCode: 200,
        timestamp: new Date()
      }
    });

    expect(event.id).toBeDefined();
    expect(event.statusCode).toBe(200);
  });

  it('queries top URLs', async () => {
    const topUrls = await prisma.downloadEvent.groupBy({
      by: ['url'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    expect(Array.isArray(topUrls)).toBe(true);
  });
});
```

Run tests:
```bash
bun test tests/integration/analytics.test.ts
```

## Security Checklist

- [ ] `ANALYTICS_API_TOKEN` is strong (min 32 chars)
- [ ] `.env` file excluded from git (`.gitignore`)
- [ ] Token never logged or exposed in errors
- [ ] HTTPS enabled in production
- [ ] Database file has restricted permissions (chmod 600)
- [ ] Input validation on all API endpoints
- [ ] URL sanitization before display
- [ ] Rate limiting enabled (optional, future)

## Monitoring

### Key Metrics

1. **Database size**: `ls -lh prisma/analytics.db`
2. **Event count**: `sqlite3 prisma/analytics.db "SELECT COUNT(*) FROM download_events;"`
3. **Recent errors**: Check `/api/analytics/errors` endpoint
4. **API response time**: Monitor dashboard load time

### Alerts

Set up alerts for:
- Database file > 500MB (retention policy needed)
- Error rate > 10% (service issues)
- Dashboard load time > 5 seconds (performance degradation)
- Authentication failures > 10/hour (potential attack)

## Next Steps

After basic implementation:
1. Add data visualization (charts)
2. Implement date range filtering
3. Add export to CSV functionality
4. Create CLI tool for analytics queries (constitution requirement)
5. Add real-time updates via Server-Sent Events
6. Implement data retention policy
7. Add more detailed URL analysis

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Project Constitution](../../.specify/memory/constitution.md)
- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
