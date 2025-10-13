# Data Model: PDF Download Analytics Dashboard

**Feature**: 001-create-a-simple
**Date**: 2025-01-13
**Purpose**: Define database schema, entities, relationships, and validation rules

## Overview

The analytics system tracks individual download events and provides aggregated views for dashboard display. The data model prioritizes query performance for read-heavy analytics workloads while maintaining write efficiency for event recording.

## Entity Definitions

### DownloadEvent

**Purpose**: Records every PDF download attempt through the API

**Attributes**:
- `id` (String, Primary Key): UUID identifier for the event
- `url` (String, Required): The URL that was requested for PDF merge/download
- `statusCode` (Integer, Required): HTTP status code returned (100-599)
- `timestamp` (DateTime, Required): When the download occurred (UTC)
- `userAgent` (String, Optional): Client User-Agent header for diagnostics
- `responseTime` (Integer, Optional): Time in milliseconds to complete the request
- `errorMessage` (String, Optional): Error details if status >= 400

**Validation Rules**:
- `url`: Max length 2048 characters (standard URL max); non-empty
- `statusCode`: Range 100-599 (valid HTTP status codes)
- `timestamp`: Must be <= current time (no future events)
- `responseTime`: Must be >= 0 if provided
- `errorMessage`: Max length 1000 characters

**Indexes**:
- Primary index on `id` (auto-generated)
- Index on `statusCode` for fast aggregation by status
- Index on `url` for Top URLs query
- Composite index on `(statusCode, timestamp)` for error time-series analysis
- Index on `timestamp` for date range queries (future enhancement)

**Relationships**:
- None (denormalized for analytics performance)

### UrlStatistics (Derived View)

**Purpose**: Aggregated statistics per URL for dashboard queries

**Note**: This is a computed view, not a separate table. Generated on-demand via Prisma aggregation queries.

**Computed Fields**:
- `url` (String): The URL being analyzed
- `totalCount` (Integer): Total number of download attempts
- `successCount` (Integer): Count where statusCode < 400
- `errorCount` (Integer): Count where statusCode >= 400
- `lastAccessed` (DateTime): Most recent timestamp for this URL
- `firstAccessed` (DateTime): Earliest timestamp for this URL
- `successRate` (Float): Percentage of successful downloads (successCount / totalCount * 100)

**Query Pattern**:
```typescript
// Prisma aggregation query (conceptual)
const urlStats = await prisma.downloadEvent.groupBy({
  by: ['url'],
  _count: { id: true },
  _min: { timestamp: true },
  _max: { timestamp: true },
  where: { /* filters */ },
  orderBy: { _count: { id: 'desc' } },
  take: 25
});
```

## Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
// Prisma schema for PDF Download Analytics

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model DownloadEvent {
  id            String   @id @default(uuid())
  url           String
  statusCode    Int
  timestamp     DateTime @default(now())
  userAgent     String?
  responseTime  Int?
  errorMessage  String?

  @@index([statusCode])
  @@index([url])
  @@index([statusCode, timestamp])
  @@index([timestamp])
  @@map("download_events")
}
```

**Environment Variable**:
```env
DATABASE_URL="file:./analytics.db"
```

## Data Access Patterns

### 1. Record Download Event (Write)

**Frequency**: Every PDF download request (high volume)
**Performance Target**: < 10ms write latency (p95)

**Query**:
```typescript
await prisma.downloadEvent.create({
  data: {
    url: req.url,
    statusCode: res.statusCode,
    timestamp: new Date(),
    userAgent: req.headers['user-agent'],
    responseTime: performance.now() - startTime,
    errorMessage: error?.message
  }
});
```

**Optimization**: Fire-and-forget async pattern; don't await in request handler

### 2. Status Code Overview (Read)

**Frequency**: Dashboard page load + periodic refresh
**Performance Target**: < 100ms query time

**Query**:
```typescript
const overview = await prisma.downloadEvent.groupBy({
  by: ['statusCode'],
  _count: { id: true },
  orderBy: { statusCode: 'asc' }
});

// Transform to status code categories
const categories = {
  success: overview.filter(o => o.statusCode >= 200 && o.statusCode < 300).reduce((sum, o) => sum + o._count.id, 0),
  clientError: overview.filter(o => o.statusCode >= 400 && o.statusCode < 500).reduce((sum, o) => sum + o._count.id, 0),
  serverError: overview.filter(o => o.statusCode >= 500).reduce((sum, o) => sum + o._count.id, 0)
};
```

**Indexes Used**: `statusCode` index for fast grouping

### 3. Top Accessed URLs (Read)

**Frequency**: Dashboard page load + periodic refresh
**Performance Target**: < 200ms query time
**Default Limit**: 25 URLs

**Query**:
```typescript
const topUrls = await prisma.downloadEvent.groupBy({
  by: ['url'],
  _count: { id: true },
  _max: { timestamp: true },
  orderBy: { _count: { id: 'desc' } },
  take: limit || 25
});
```

**Indexes Used**: `url` index for grouping; full table scan for sorting (acceptable for analytics)

### 4. Error Tracking (Read)

**Frequency**: Dashboard page load + periodic refresh
**Performance Target**: < 200ms query time
**Default Limit**: 50 error events

**Query**:
```typescript
const errors = await prisma.downloadEvent.findMany({
  where: { statusCode: { gte: 400 } },
  orderBy: { timestamp: 'desc' },
  take: limit || 50,
  select: {
    url,
    statusCode,
    timestamp,
    errorMessage
  }
});

// Optionally aggregate by URL
const errorsByUrl = await prisma.downloadEvent.groupBy({
  by: ['url', 'statusCode'],
  _count: { id: true },
  where: { statusCode: { gte: 400 } },
  orderBy: { _count: { id: 'desc' } },
  take: limit || 50
});
```

**Indexes Used**: Composite `(statusCode, timestamp)` index for fast error filtering and sorting

### 5. Time-Series Analysis (Future Enhancement)

**Query**:
```typescript
const timeSeries = await prisma.downloadEvent.groupBy({
  by: ['statusCode'],
  _count: { id: true },
  where: {
    timestamp: {
      gte: startDate,
      lte: endDate
    }
  },
  orderBy: { timestamp: 'asc' }
});
```

**Indexes Used**: `timestamp` index for date range filtering

## Data Lifecycle Management

### Data Retention Policy

**Default Policy**: Retain all data indefinitely (until storage concerns arise)

**Future Implementation**:
1. **Archive Old Events**: Move events older than 6-12 months to cold storage (separate table or file)
2. **Aggregation Strategy**: Replace individual events with daily/weekly summaries after archival period
3. **Backup Strategy**: Regular SQLite file backups before archival/deletion

**Monitoring**:
- Track database file size: `SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size();`
- Alert if file size exceeds 500MB (indicates potential retention policy needed)

### Database Maintenance

**SQLite Optimization**:
```sql
-- Enable WAL mode for better concurrent access
PRAGMA journal_mode=WAL;

-- Analyze query planner statistics
ANALYZE;

-- Reclaim space after deletions (if implementing retention)
VACUUM;
```

**Prisma Migration Commands**:
```bash
# Create new migration
npx prisma migrate dev --name add_download_events

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

## TypeScript Types

**Generated by Prisma** (example):

```typescript
// Auto-generated by Prisma Client
export type DownloadEvent = {
  id: string;
  url: string;
  statusCode: number;
  timestamp: Date;
  userAgent: string | null;
  responseTime: number | null;
  errorMessage: string | null;
};

// Custom types for analytics queries
export interface StatusCodeOverview {
  success: number;
  clientError: number;
  serverError: number;
  redirect: number;
  total: number;
}

export interface TopUrlStatistics {
  url: string;
  accessCount: number;
  lastAccessed: Date;
  successRate: number;
}

export interface ErrorEvent {
  url: string;
  statusCode: number;
  timestamp: Date;
  errorMessage: string | null;
}
```

## Migration Strategy

### Initial Setup

1. Install Prisma: `npm install prisma @prisma/client`
2. Initialize Prisma: `npx prisma init --datasource-provider sqlite`
3. Create schema in `prisma/schema.prisma` (content above)
4. Generate first migration: `npx prisma migrate dev --name init`
5. Generate Prisma Client: `npx prisma generate` (auto-runs after migrate)

### Schema Evolution

**Adding Fields**:
```prisma
model DownloadEvent {
  // Existing fields...
  ipAddress String? // New optional field
}
```

**Changing Fields** (requires data migration):
```typescript
// In migration SQL
ALTER TABLE download_events ADD COLUMN new_field TEXT;
UPDATE download_events SET new_field = old_field WHERE condition;
ALTER TABLE download_events DROP COLUMN old_field;
```

**Breaking Changes** (requires version bump):
- Removing required fields
- Changing field types incompatibly
- Renaming fields without alias

### Testing Schema Changes

1. Test migration on dev database: `npx prisma migrate dev`
2. Verify Prisma Client types updated: `npx prisma generate`
3. Run application locally to verify queries work
4. Test on both Bun and Node.js runtimes
5. Deploy migration to production: `npx prisma migrate deploy`

## Security Considerations

### Input Sanitization

**URL Field**:
- Validate URL format (basic pattern matching)
- Truncate to max 2048 characters
- Escape special characters for display in dashboard
- Consider hashing sensitive query parameters (future enhancement)

**Status Code Field**:
- Validate range 100-599
- Reject invalid codes with error logging

**Error Message Field**:
- Sanitize to prevent XSS in dashboard display
- Truncate to 1000 characters
- Remove sensitive data (API keys, tokens) if present in error messages

### Data Privacy

**PII Considerations**:
- URLs may contain sensitive query parameters (API tokens, user IDs)
- User-Agent may contain identifying information
- Consider anonymization strategy for production data in development environments

**Access Control**:
- Database file permissions: Read/write only by application user
- Prisma Studio access: Development only, not exposed in production
- Dashboard authentication required for all analytics endpoints

## Performance Benchmarks

**Expected Query Performance** (SQLite on modern hardware):

| Query Type | Row Count | Expected Time | Index |
|-----------|-----------|---------------|-------|
| Record Event | 1 | < 10ms | Primary key |
| Status Overview | 100k events | < 100ms | statusCode |
| Top 25 URLs | 100k events | < 200ms | url |
| Error Tracking (50) | 100k events | < 150ms | statusCode + timestamp |
| Full Table Scan | 100k events | < 500ms | None |

**Scaling Limits**:
- SQLite handles millions of rows efficiently
- Write concurrency: ~1000 writes/second with WAL mode
- Database file size: Practical limit ~140TB (SQLite theoretical max)
- For this use case: Expect no issues up to 10M events (~500MB database file)

**Optimization Triggers**:
- Query time > 500ms: Add indexes or optimize query
- Write latency > 50ms: Consider batching or PostgreSQL migration
- Database file > 1GB: Implement data retention policy
