# Research: PDF Download Analytics Dashboard

**Feature**: 001-create-a-simple
**Date**: 2025-01-13
**Purpose**: Document technology choices, architectural patterns, and best practices for analytics dashboard implementation

## Technology Decisions

### 1. ORM Selection: Prisma

**Decision**: Use Prisma ORM with SQLite for analytics data persistence

**Rationale**:
- **Type Safety**: Prisma generates TypeScript types from schema, ensuring compile-time safety for database queries
- **Cross-Runtime Support**: Works with both Bun and Node.js (constitution requirement II)
- **Migration Management**: Built-in migration system with version control
- **Developer Experience**: Excellent VS Code integration, intuitive query API
- **Performance**: Efficient query generation, connection pooling built-in

**Alternatives Considered**:
- **Raw SQLite with better-sqlite3**: Rejected because lacks type safety, requires manual migration management
- **TypeORM**: Rejected due to complex decorator syntax and less polished Bun support
- **Drizzle ORM**: Strong contender but Prisma has better documentation and larger community

**References**:
- Prisma with SQLite: https://www.prisma.io/docs/orm/overview/databases/sqlite
- Bun compatibility: https://bun.sh/guides/ecosystem/prisma

### 2. Database Choice: SQLite

**Decision**: Use SQLite for analytics storage

**Rationale**:
- **Simplicity**: Zero-configuration, file-based database suitable for analytics workload
- **Performance**: Fast for read-heavy analytics queries with proper indexing
- **Portability**: Single file, easy backups and migrations
- **Scale Appropriate**: Handles 100k+ events easily; can migrate to PostgreSQL if needed
- **Development Speed**: No separate database server required

**Alternatives Considered**:
- **PostgreSQL**: Overkill for current scale; adds deployment complexity; can migrate later if needed
- **MongoDB**: Document model doesn't fit relational analytics data; TypeScript integration less mature
- **In-Memory (Redis)**: Data persistence requirement rules out in-memory only solution

**Migration Path**: If scale exceeds SQLite capacity (millions of events, high write concurrency), Prisma supports seamless migration to PostgreSQL with minimal code changes.

###3. Frontend Framework: React with Vite

**Decision**: Use React 18+ with Vite for dashboard frontend

**Rationale**:
- **React**: Industry-standard, component-based architecture, excellent TypeScript support
- **Vite**: Lightning-fast HMR (Hot Module Replacement), optimized builds, native ES modules
- **TypeScript Integration**: First-class TypeScript support in both React and Vite
- **Build Performance**: Vite significantly faster than webpack-based alternatives
- **Developer Experience**: Instant server start, rapid feedback loop

**Alternatives Considered**:
- **Vue 3**: Excellent choice but team may be more familiar with React ecosystem
- **Svelte**: Smaller bundle sizes but smaller ecosystem and less familiar syntax
- **Server-Side Rendered HTML**: Rejected due to poor interactivity for real-time analytics updates

**Component Strategy**:
- Functional components with hooks (modern React pattern)
- Composition over inheritance
- Keep components small and focused (constitution principle VI: Simplicity)

**References**:
- Vite guide: https://vitejs.dev/guide/
- React + TypeScript: https://react.dev/learn/typescript

### 4. Authentication Strategy: Token-Based

**Decision**: Simple API token authentication via environment variable

**Rationale**:
- **Simplicity**: Single token in `.env` file, no database or session management required
- **Security**: Sufficient for internal admin tool with low user count (< 10 users)
- **Stateless**: No session storage, easier to scale
- **Standard Practice**: `X-API-Token` header follows common API authentication patterns

**Implementation**:
- Environment variable: `ANALYTICS_API_TOKEN`
- Middleware validates token on all `/api/analytics/*` and dashboard routes
- Frontend stores token in memory (not localStorage for security)
- Token rotation requires environment variable update and restart

**Alternatives Considered**:
- **JWT**: Overkill for single-token scenario; adds complexity without benefit
- **OAuth2**: Massive overkill for admin-only tool
- **Basic Auth**: Less flexible than token-based; passwords in config files are anti-pattern

**Future Enhancement**: If multi-user access needed, upgrade to JWT with user management.

### 5. Analytics Recording Pattern: Express Middleware

**Decision**: Use Express middleware to capture download events non-blocking

**Rationale**:
- **Non-Blocking**: Middleware records analytics asynchronously, doesn't delay PDF response
- **Centralized**: Single middleware captures all requests automatically
- **Error Isolation**: Analytics failures don't affect PDF merge operations (constitution principle III)
- **Standard Pattern**: Follows Express middleware conventions

**Implementation Strategy**:
```typescript
// Pseudocode - actual implementation in tasks
app.use('/api/analytics/event', analyticsMiddleware);
app.post('/', async (req, res) => {
  // Existing PDF merge logic
  // After response sent, trigger analytics event
});
```

**Error Handling**:
- Try-catch around analytics recording
- Log errors but never throw/reject to avoid impacting PDF operations
- Consider dead-letter queue for failed analytics events (future enhancement)

**Alternatives Considered**:
- **Manual tracking in each route**: Rejected due to duplication and maintainability issues
- **Separate analytics service**: Over-engineering for current scale
- **Log parsing approach**: Less reliable, requires separate log processing pipeline

### 6. API Design: RESTful Endpoints

**Decision**: RESTful API design for analytics endpoints

**Endpoints**:
- `GET /api/analytics/overview` - Summary statistics by status code
- `GET /api/analytics/top-urls?limit=25` - Most accessed URLs (default 25)
- `GET /api/analytics/errors?limit=50` - Error tracking (default 50)
- `POST /api/analytics/event` - Internal endpoint for recording events
- `GET /dashboard` - Serve React SPA

**Query Parameters**:
- `limit`: Number of results (default varies by endpoint)
- `from`: ISO timestamp for date range filtering (future enhancement)
- `to`: ISO timestamp for date range filtering (future enhancement)

**Response Format**:
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": { "timestamp": "ISO-8601", "count": 123 }
}
```

**Alternatives Considered**:
- **GraphQL**: Overkill for simple analytics queries; adds complexity
- **gRPC**: Not web-friendly for dashboard frontend
- **Webhook/SSE for real-time**: Over-engineering; periodic polling sufficient

### 7. Frontend State Management

**Decision**: React hooks with fetch API (no global state library)

**Rationale**:
- **Simplicity**: Dashboard is simple, no complex state management needed
- **Constitution Alignment**: YAGNI principle - don't add Redux/Zustand unless necessary
- **Standard APIs**: `useState`, `useEffect`, `fetch` are sufficient

**Data Fetching Pattern**:
- Custom `useAnalytics` hook for API calls
- Periodic polling (every 30 seconds) for auto-refresh
- Loading and error states handled per component

**Alternatives Considered**:
- **Redux**: Massive overkill for analytics dashboard
- **React Query**: Great library but adds dependency; not needed for simple polling
- **Zustand**: Lightweight but still unnecessary for current scope

### 8. Dashboard Layout Strategy

**Decision**: Single-page dashboard with sections for each analytics view

**Layout**:
- Header: Title + last updated timestamp
- Section 1: Status Code Overview (pie chart or bar chart)
- Section 2: Top Accessed URLs (table)
- Section 3: Error Tracking (table with trend indicators)
- Footer: Refresh button + auto-refresh indicator

**Styling**:
- **Option A**: Minimal custom CSS (keep it simple)
- **Option B**: Tailwind CSS (utility-first, no custom CSS files)
- **Recommended**: Option A for simplicity unless team prefers Tailwind

**Responsive Design**: Desktop-first (admin tool), basic mobile responsiveness

**Alternatives Considered**:
- **Multi-page dashboard**: Rejected; single page shows all analytics at a glance
- **Data visualization library (Chart.js, Recharts)**: Nice-to-have but not MVP requirement

## Best Practices & Patterns

### Database Schema Design

**Indexing Strategy**:
- Index on `statusCode` for fast aggregation by status
- Index on `url` for Top URLs query
- Composite index on `(url, statusCode)` for error tracking
- Index on `timestamp` for future time-range queries

**Query Optimization**:
- Use Prisma's aggregation functions (`count`, `groupBy`)
- Limit results with `take` parameter
- Consider materialized view pattern if queries become slow (future optimization)

### Security Considerations

**Token Security**:
- Store `ANALYTICS_API_TOKEN` in `.env`, never commit to git
- Use strong random token (min 32 characters, alphanumeric + symbols)
- Rotate token periodically (manual process)

**Input Validation**:
- Validate `limit` query parameters (max 1000 to prevent DoS)
- Sanitize URL strings before storing (prevent XSS in dashboard)
- Validate status codes (100-599 range)

**CORS Configuration**:
- Dashboard served from same origin as API (no CORS needed)
- If future external access needed, whitelist specific origins

### Performance Optimizations

**Analytics Recording**:
- Fire-and-forget pattern (don't await analytics in request handler)
- Consider batching if write volume exceeds SQLite capacity
- Add write-ahead logging (WAL) mode for SQLite

**Dashboard Performance**:
- Vite production build optimizations (minification, tree-shaking)
- Static asset caching headers
- Lazy load components if bundle size grows

**Database Maintenance**:
- Monitor database file size
- Implement data retention policy (archive old events after 6-12 months)
- Periodic `VACUUM` command to reclaim space

### Error Handling Patterns

**Analytics Service**:
```typescript
async recordEvent(event: DownloadEvent) {
  try {
    await prisma.downloadEvent.create({ data: event });
  } catch (error) {
    console.error('Analytics recording failed:', error);
    // Never throw - analytics failures should not impact PDF operations
  }
}
```

**Dashboard API**:
```typescript
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const stats = await analyticsService.getOverview();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Analytics query failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});
```

### Testing Strategy

**Manual Testing** (primary approach per constitution):
1. Record download events through PDF merge API
2. Verify events appear in database (`npx prisma studio`)
3. Check dashboard displays correct counts
4. Test authentication with valid/invalid tokens
5. Verify error handling (disconnect database, invalid queries)

**Optional Integration Tests** (if time permits):
- Test analytics recording middleware
- Test API endpoint responses
- Test authentication middleware
- Mock Prisma client for unit tests

**Cross-Runtime Testing**:
- Test analytics recording on both Bun and Node.js
- Verify Prisma queries work identically on both runtimes
- Check Express server behavior on both runtimes

## Implementation Priorities

### Phase 1: MVP (Must Have)
1. Database schema with Prisma
2. Analytics recording middleware
3. Basic API endpoints (overview, top URLs, errors)
4. Token authentication
5. Simple React dashboard (tables, no charts)
6. Dashboard deployment (static files served by Express)

### Phase 2: Polish (Should Have)
1. Data visualization (basic charts)
2. Auto-refresh functionality
3. Better error messaging in UI
4. Loading states and spinners
5. Responsive design improvements

### Phase 3: Future Enhancements (Nice to Have)
1. Date range filtering
2. Export analytics to CSV
3. Data retention policies
4. More detailed URL analysis (query params)
5. Real-time updates via Server-Sent Events
6. CLI tool for analytics queries (constitution principle I)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SQLite write bottleneck at scale | High | Low | Monitor performance; migrate to PostgreSQL if needed; Prisma makes this easy |
| Analytics failures block PDF operations | High | Medium | Fire-and-forget pattern; comprehensive error handling; never throw in analytics code |
| Token leakage | High | Low | Strong token generation; environment variable only; rotate periodically |
| Frontend bundle size too large | Medium | Low | Vite optimization; lazy loading; avoid heavy dependencies |
| Prisma migration conflicts | Medium | Low | Follow migration best practices; test migrations before production |

## Dependencies & Installation

**Backend Dependencies** (add to main package.json):
```json
{
  "@prisma/client": "^5.22.0",
  "prisma": "^5.22.0"
}
```

**Frontend Dependencies** (dashboard/package.json):
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "vite": "^5.4.11",
  "@vitejs/plugin-react": "^4.3.4",
  "typescript": "^5.7.3",
  "@types/react": "^18.3.18",
  "@types/react-dom": "^18.3.5"
}
```

**Development Tools**:
- Prisma Studio for database inspection: `npx prisma studio`
- Prisma migrations: `npx prisma migrate dev`
- Vite dev server: `npm run dev` (in dashboard directory)

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [SQLite Performance Tuning](https://www.sqlite.org/speed.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Vite Features](https://vitejs.dev/guide/features.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PDF Merger API Constitution](../../.specify/memory/constitution.md)
