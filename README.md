# PDF Merger API

A high-performance TypeScript application that provides both an HTTP API and CLI tool for merging multiple PDF files. Built with Bun runtime, Express, and pdf-lib.

## Features

- **PDF Merging**: Merge multiple PDF files into a single document
- **Batch Processing**: Async batch processing with webhook notifications
- **App Token Management**: Secure API tokens for batch operations
- **Metadata Support**: Set title, author, subject, and keywords for merged PDFs
- **Multiple Input Sources**: Support for URLs, local files, and buffers
- **Analytics Dashboard**: Web-based dashboard for tracking PDF operations
- **URL Tracking**: Monitor each PDF URL's success rate, access count, and errors
- **PDF Processing Metrics**: Track processing time, success rates, and error types
- **Automatic Retry**: 3 retry attempts with 5-second delay for failed downloads
- **Encrypted PDF Support**: Handle password-protected PDFs with `ignoreEncryption` option
- **Multi-Database Support**: SQLite (default), PostgreSQL, and MySQL

## Prerequisites

- [Bun](https://bun.sh) (version 1.1.45 or higher) - Preferred runtime
- Node.js (version 20 or higher) - Alternative runtime
- SQLite, PostgreSQL, or MySQL (for analytics storage)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pdf-merger-api.git
   cd pdf-merger-api
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up the database:

   ```bash
   # Generate Prisma client
   bun run prisma:generate

   # Apply database schema
   bun run prisma:push
   ```

4. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `REQUEST_TIMEOUT` | PDF download timeout (ms) | `10000` |
| `DATABASE_URL` | Database connection string | Required |
| `DATABASE_PROVIDER` | `sqlite`, `postgresql`, or `mysql` | `sqlite` |
| `NODE_ENV` | `development`, `production`, or `test` | `development` |
| `ANALYTICS_API_TOKEN` | Dashboard authentication token (min 32 chars) | `dev-token-change-me-in-production-min32chars` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | SSL certificate validation (`1` or `0`) | `1` |
| `SKIP_ENV_VALIDATION` | Skip validation during Docker builds | `false` |
| `BATCH_STORAGE_PATH` | Directory for batch output files | `./batch-storage` |
| `BATCH_FILE_TTL` | Time-to-live for batch files (ms) | `86400000` (24h) |
| `BATCH_MAX_CONCURRENT_DOWNLOADS` | Max concurrent PDF downloads | `10` |
| `BATCH_CLEANUP_INTERVAL` | Interval for cleanup job (ms) | `3600000` (1h) |
| `BATCH_WEBHOOK_TIMEOUT` | Webhook request timeout (ms) | `30000` |
| `BASE_URL` | Base URL for download links | `http://localhost:3000` |

### Environment Validation

This project uses **Zod** for type-safe environment variable validation:

- **Type Safety**: TypeScript knows the exact types of all env vars
- **Runtime Validation**: Invalid values are caught immediately with clear error messages
- **Default Values**: Sensible defaults for development
- **Security**: Required minimum lengths for sensitive values like API tokens

**Example validation error:**

```bash
❌ Invalid environment variables:
{
  formErrors: [],
  fieldErrors: {
    ANALYTICS_API_TOKEN: [ 'ANALYTICS_API_TOKEN must be at least 32 characters' ]
  }
}
```

**Generate a secure token:**

```bash
openssl rand -hex 32
```

## Usage

### Starting the Server

```bash
# Development (with hot reload)
bun start

# Production (compiled)
bun run build && bun run serve
```

The server runs on port 3000 by default: `http://localhost:3000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun start` | Run development server with ts-node |
| `bun run build` | Compile TypeScript to JavaScript |
| `bun run serve` | Run compiled production server |
| `bun run cli` | Run CLI tool (requires build) |
| `bun run lint` | Lint code with Biome (--write --unsafe) |
| `bun run lint:fix` | Fix lint issues (--write only) |
| `bun run prisma:generate` | Generate Prisma client |
| `bun run prisma:push` | Apply database schema |
| `bun run release` | Run semantic-release |

## API Endpoints

### PDF Merging

#### POST /

Merge multiple PDF files from URLs.

**Request Body:**

```json
{
  "title": "merged-document",
  "author": "John Doe",
  "subject": "Merged PDF",
  "keywords": ["pdf", "merge", "example"],
  "sources": [
    "https://example.com/file1.pdf",
    "https://example.com/file2.pdf"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Title of the merged PDF |
| `author` | string | No | Author metadata |
| `subject` | string | No | Subject metadata |
| `keywords` | string[] | No | Keywords metadata |
| `sources` | string[] | Yes | URLs of PDFs to merge |

**Response:** Binary PDF file download

**Features:**
- Parallel downloads while preserving original order
- Graceful handling of partial failures (skips failed downloads)
- Automatic retry: 3 attempts with 5-second delay
- Analytics recording for each download

**Example with curl:**

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "merged-document",
    "author": "John Doe",
    "sources": [
      "https://example.com/file1.pdf",
      "https://example.com/file2.pdf"
    ]
  }' \
  --output merged.pdf
```

**Batch Processing Example:**

```bash
# 1. Create an app in the dashboard and get the token

# 2. Submit a batch job
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Token: YOUR_APP_TOKEN" \
  -d '{
    "webhookUrl": "https://your-server.com/webhook",
    "groups": [
      {"name": "group1", "sources": ["https://example.com/a.pdf", "https://example.com/b.pdf"]},
      {"name": "group2", "sources": ["https://example.com/c.pdf", "https://example.com/d.pdf"]}
    ]
  }'

# 3. Check status
curl http://localhost:3000/batch/BATCH_ID \
  -H "X-API-Token: YOUR_APP_TOKEN"

# 4. Download when ready
curl http://localhost:3000/batch/BATCH_ID/download/group1 \
  -H "X-API-Token: YOUR_APP_TOKEN" \
  --output group1.pdf
```

#### GET /health

Health check endpoint.

**Response:** `Server is healthy`

### Analytics API

All analytics endpoints require authentication via `X-API-Token` header.

```bash
curl -H "X-API-Token: your-token-here" http://localhost:3000/api/analytics/overview
```

#### GET /api/analytics/health

Check database connectivity.

#### GET /api/analytics/overview

Get status code distribution and total request count.

**Response:**

```json
{
  "statusCodes": {
    "success": 150,
    "redirect": 5,
    "clientError": 10,
    "serverError": 2
  },
  "total": 167
}
```

#### GET /api/analytics/top-urls

Get most accessed PDF URLs.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 25 | Maximum URLs to return |

**Response:**

```json
[
  {
    "url": "https://example.com/doc.pdf",
    "count": 45,
    "successRate": 0.95,
    "firstAccess": "2024-01-01T00:00:00Z",
    "lastAccess": "2024-01-15T12:00:00Z"
  }
]
```

#### GET /api/analytics/errors

Get error tracking information.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum errors to return |
| `groupBy` | string | - | Group by `url` (optional) |

#### GET /api/analytics/downloads

Get paginated download history with filtering.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 25 | Items per page |
| `sortBy` | string | `timestamp` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |
| `search` | string | - | Filter by URL |
| `statusCode` | number | - | Filter by status code |
| `statusRange` | string | - | `success`, `redirect`, `clientError`, `serverError` |
| `dateFrom` | string | - | ISO date filter |
| `dateTo` | string | - | ISO date filter |

#### GET /api/analytics/chart-data

Get time-series data for charts.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `groupBy` | string | `week` | `hour`, `day`, `week`, `month` |

#### GET /api/analytics/processing/overview

Get PDF processing statistics.

**Response:**

```json
{
  "totalProcessed": 500,
  "successRate": 0.98,
  "avgProcessingTime": 1250,
  "errorsByType": {
    "ENCRYPTED": 5,
    "CORRUPTED": 3
  }
}
```

#### GET /api/analytics/processing/errors

Get PDF processing errors.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum errors to return |

### Batch Processing API

The batch processing API allows you to submit multiple PDF merge jobs asynchronously with webhook notifications.

**Authentication:** All batch endpoints require an App Token via `X-API-Token: <app-token>` header.

#### POST /batch

Submit a new batch job with grouped PDFs.

**Request Body:**

```json
{
  "webhookUrl": "https://example.com/webhook",
  "groups": [
    {
      "name": "contract-2024",
      "sources": [
        "https://example.com/page1.pdf",
        "https://example.com/page2.pdf"
      ]
    },
    {
      "name": "invoice-jan",
      "sources": [
        "https://example.com/invoice1.pdf",
        "https://example.com/invoice2.pdf",
        "https://example.com/invoice3.pdf"
      ]
    }
  ],
  "metadata": {
    "author": "System",
    "subject": "Batch Processing"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webhookUrl` | string | Yes | URL to receive completion notification |
| `groups` | array | Yes | Array of PDF groups (1-50 groups) |
| `groups[].name` | string | Yes | Unique name for the group (used in download URL) |
| `groups[].sources` | string[] | Yes | URLs of PDFs to merge (1-100 per group) |
| `metadata` | object | No | Optional metadata for all merged PDFs |
| `metadata.author` | string | No | Author metadata |
| `metadata.subject` | string | No | Subject metadata |

**Response (202 Accepted):**

```json
{
  "success": true,
  "data": {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "groupCount": 2,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /batch/:id

Get batch job status with group details.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": {
      "total": 2,
      "completed": 1,
      "failed": 0
    },
    "groups": [
      {
        "name": "contract-2024",
        "status": "completed",
        "downloadUrl": "/batch/550e8400.../download/contract-2024"
      },
      {
        "name": "invoice-jan",
        "status": "processing"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "startedAt": "2024-01-15T10:30:05Z",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

**Batch Status Values:**
- `queued` - Waiting to be processed
- `processing` - Currently being processed
- `completed` - All groups completed successfully
- `partial` - Some groups failed
- `failed` - All groups failed
- `expired` - Files have been cleaned up

#### GET /batch/:id/download/:groupName

Download the merged PDF for a specific group.

**Response:**
- Success: Binary PDF file download
- 404: File not found or not yet processed
- 410: Batch has expired (files cleaned up)

#### Webhook Notification

When a batch completes (or partially fails), a POST request is sent to the `webhookUrl`:

```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "results": [
    {
      "name": "contract-2024",
      "downloadUrl": "http://localhost:3000/batch/550e8400.../download/contract-2024",
      "expiresAt": "2024-01-16T10:30:00Z"
    },
    {
      "name": "invoice-jan",
      "downloadUrl": "http://localhost:3000/batch/550e8400.../download/invoice-jan",
      "expiresAt": "2024-01-16T10:30:00Z"
    }
  ],
  "summary": {
    "total": 2,
    "success": 2,
    "failed": 0
  },
  "completedAt": "2024-01-15T10:35:00Z"
}
```

**Failed Group Example:**

```json
{
  "name": "invoice-jan",
  "error": "All PDF downloads failed"
}
```

### App Token Management API

Manage API tokens for batch processing access. All endpoints require dashboard authentication via `X-API-Token` header.

#### GET /api/apps

List all registered apps with usage statistics.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "app-uuid",
      "name": "my-system",
      "token": "abc12345...",
      "tokenPreview": "abc12345",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "stats": {
        "totalJobs": 25,
        "completedJobs": 22,
        "failedJobs": 1,
        "partialJobs": 2,
        "successRate": 88.0,
        "lastActivity": "2024-01-15T12:00:00Z"
      }
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T12:00:00Z",
    "count": 1
  }
}
```

#### GET /api/apps/:id

Get detailed app information with comprehensive statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "app-uuid",
    "name": "my-system",
    "token": "full-64-char-token-here...",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "stats": {
      "batch": {
        "totalJobs": 25,
        "completedJobs": 22,
        "failedJobs": 1,
        "partialJobs": 2,
        "successRate": 88.0,
        "lastActivity": "2024-01-15T12:00:00Z"
      },
      "downloads": {
        "total": 150,
        "success": 145,
        "failed": 5,
        "successRate": 96.67,
        "avgResponseTime": 1250,
        "lastDownload": "2024-01-15T12:00:00Z"
      },
      "processing": {
        "total": 145,
        "success": 143,
        "failed": 2,
        "successRate": 98.62,
        "avgProcessingTime": 850,
        "lastProcessing": "2024-01-15T12:00:00Z"
      }
    }
  },
  "meta": {
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### POST /api/apps

Create a new app with a generated token.

**Request Body:**

```json
{
  "name": "my-new-app"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique app name (3-50 chars, alphanumeric with `-` and `_`) |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "app-uuid",
    "name": "my-new-app",
    "token": "generated-64-char-secure-token...",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Important:** Save the token immediately. It cannot be retrieved again.

#### PATCH /api/apps/:id/toggle

Toggle app active status (enable/disable).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "app-uuid",
    "name": "my-app",
    "isActive": false
  }
}
```

#### POST /api/apps/:id/regenerate-token

Generate a new token (invalidates the old one immediately).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "app-uuid",
    "name": "my-app",
    "token": "new-64-char-secure-token..."
  }
}
```

#### DELETE /api/apps/:id

Delete an app and all associated batch jobs.

**Response:**

```json
{
  "success": true,
  "message": "App deleted successfully"
}
```

## Analytics Dashboard

Access the web-based dashboard at `http://localhost:3000/dashboard`

**Authentication:**
- Enter your `ANALYTICS_API_TOKEN` in the login page
- Development default: `dev-token-change-me-in-production-min32chars`

**Dashboard Tabs:**
- **Overview**: Download statistics by status code
- **Top URLs**: Most accessed PDF URLs with success rates
- **Error Tracking**: Failed downloads and error messages
- **Downloads**: Paginated download history with filtering
- **Processing**: PDF processing metrics and errors
- **Apps**: Manage API tokens for batch processing (cards layout with detailed statistics per app)

## Database Configuration

### SQLite (Default)

No additional setup required. Database file created at `./database/analytics.db`.

```bash
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:../database/analytics.db"
```

### PostgreSQL

```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:password@localhost:5432/analytics?schema=public"
```

Setup:

```bash
# Create the database
createdb analytics

# Apply schema directly (recommended for any provider)
bunx prisma db push
```

### MySQL

```bash
DATABASE_PROVIDER=mysql
DATABASE_URL="mysql://user:password@localhost:3306/analytics"
```

Setup:

```sql
CREATE DATABASE analytics;
```

```bash
# Apply schema directly (recommended for any provider)
bunx prisma db push
```

### Switching Database Providers

This project uses `prisma db push` for schema synchronization, which works seamlessly across all providers without provider-specific migration files.

**For local development with a different provider:**

```bash
# 1. Update .env with new provider and DATABASE_URL
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:password@localhost:5432/analytics"

# 2. Update the schema provider
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# 3. Apply schema to new database
bunx prisma db push
```

**Note:** If migrating data from one provider to another, you'll need to export and reimport the data manually.

## CLI Usage

The CLI tool merges PDFs from local files or directories.

```bash
# Build first
bun run build

# Merge PDFs
bun cli <input_file_or_directory> [output.pdf]
```

### Examples

```bash
# Merge all PDFs in a directory
bun cli ./pdfs merged-output.pdf

# Merge a single PDF (useful for validation)
bun cli ./document.pdf output.pdf

# Auto-generate output filename (UUID-based)
bun cli ./pdfs
```

### CLI Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `input` | Yes | Path to PDF file or directory |
| `output` | No | Output filename (auto-generated if omitted) |

## Docker Deployment

### Building Images

```bash
# SQLite (default)
docker build -f docker/Dockerfile -t merger-pdf .

# PostgreSQL
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=postgresql -t merger-pdf:postgres .

# MySQL
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=mysql -t merger-pdf:mysql .
```

### Build Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `DB_PROVIDER` | `sqlite` | Database provider |
| `DATABASE_URL` | `file:../database/analytics.db` | Database connection string |
| `REQUEST_TIMEOUT` | `30000` | Request timeout (ms) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `1` | SSL validation |

### Running Containers

**SQLite:**

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/batch-storage:/app/batch-storage \
  -e DATABASE_URL="file:../database/analytics.db" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here-min-32-chars" \
  -e BASE_URL="https://your-domain.com" \
  --name merger-pdf-api \
  merger-pdf
```

**PostgreSQL:**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/analytics" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here-min-32-chars" \
  --name merger-pdf-api \
  merger-pdf:postgres
```

**MySQL:**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:password@host.docker.internal:3306/analytics" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here-min-32-chars" \
  --name merger-pdf-api \
  merger-pdf:mysql
```

### Docker Compose

**SQLite:**

```yaml
version: '3.8'
services:
  merger-pdf:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./database:/app/database
      - ./batch-storage:/app/batch-storage
    environment:
      - DATABASE_URL=file:../database/analytics.db
      - ANALYTICS_API_TOKEN=your-secure-token-here-min-32-chars
      - BASE_URL=https://your-domain.com
    restart: unless-stopped
```

**PostgreSQL:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: merger
      POSTGRES_PASSWORD: secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  merger-pdf:
    build:
      context: .
      dockerfile: docker/Dockerfile
      args:
        DB_PROVIDER: postgresql
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://merger:secure-password@postgres:5432/analytics
      - ANALYTICS_API_TOKEN=your-secure-token-here-min-32-chars
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

### Docker CLI

```bash
# Using Docker for CLI
docker run -v $(pwd):/data merger-pdf merge-pdf /data/input /data/output.pdf
```

### Important Notes

1. **Automatic Schema Sync**: Database schema is applied automatically on container startup using `prisma db push`
2. **Volume Mapping**: Mount `/app/database` for SQLite persistence and `/app/batch-storage` for batch files
3. **Environment Variables**: Pass at runtime, not during build (security)
4. **BASE_URL**: Set this to your public URL for correct download links in webhooks
5. **Quick Restart**:

   ```bash
   docker stop merger-pdf && docker rm merger-pdf && \
   docker run -d --name merger-pdf -p 3000:3000 merger-pdf
   ```

## Troubleshooting

### Common Issues

**SSL Certificate Errors:**

```bash
# For self-signed certificates in development
NODE_TLS_REJECT_UNAUTHORIZED=0 bun start
```

**Database Connection Issues:**

```bash
# Verify database file exists (SQLite)
ls -la database/analytics.db

# Check Prisma client
bun run prisma:generate
```

**PDF Download Timeouts:**

```bash
# Increase timeout (default: 10000ms)
REQUEST_TIMEOUT=30000 bun start
```

**Encrypted PDFs:**

The application handles encrypted PDFs with `ignoreEncryption: true`. If issues persist, the PDF may be corrupted.

**Docker Schema Errors:**

```bash
# Rebuild with fresh schema
docker build --no-cache -f docker/Dockerfile -t merger-pdf .
```

### Retry Behavior

Failed PDF downloads are automatically retried:
- **Attempts**: 3 total
- **Delay**: 5 seconds between attempts
- **Triggers**: Network errors, 5xx status codes

### Analytics Not Recording

1. Verify database connection: `GET /api/analytics/health`
2. Check `DATABASE_URL` configuration
3. Ensure schema is applied: `bunx prisma db push`

## Error Handling

| Status Code | Description |
|-------------|-------------|
| `400` | Invalid request body (missing required fields) |
| `401` | Unauthorized (invalid or missing API token) |
| `500` | Internal server error |

## Security Considerations

- **API Token**: Use a strong, unique token (minimum 32 characters)
- **SSL/TLS**: Keep `NODE_TLS_REJECT_UNAUTHORIZED=1` in production
- **Database**: Use strong passwords and network isolation
- **Docker**: Never bake secrets into images; use runtime environment variables

## Performance

- **Parallel Downloads**: PDFs are downloaded concurrently
- **Order Preservation**: Original source order maintained despite parallel processing
- **SQLite WAL Mode**: Better concurrency for read-heavy workloads
- **Indexed Queries**: Database indexes on frequently queried columns
- **Graceful Degradation**: Failed downloads don't crash the entire merge

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### Development Setup

```bash
# Install dependencies
bun install

# Set up database
bun run prisma:generate
bun run prisma:push

# Start development server
bun start

# Run linter
bun run lint:fix
```

### Commit Convention

This project uses [Angular commit convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit):

- `feat:` New feature (minor version)
- `fix:` Bug fix (patch version)
- `refactor:` Code refactoring (patch version)
- `style:` Code style changes (patch version)
- `docs:` Documentation only
- `test:` Adding tests
- `chore:` Maintenance tasks

Breaking changes: Add `!` after type (e.g., `feat!:`) for major version bump.
