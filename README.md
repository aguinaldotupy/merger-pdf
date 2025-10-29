# PDF Merger API

This project is a Bun application that provides an API to merge multiple PDF files into a single PDF. It uses Express for handling HTTP requests and pdf-lib for PDF manipulation.

## Features

- Merge multiple PDF files into a single PDF.
- Set metadata such as title, author, subject, and keywords for the merged PDF.
- Download the merged PDF directly from the API.
- **Analytics Dashboard**: Track PDF download statistics with a web-based dashboard.
- **Individual URL Tracking**: Monitor each PDF URL's success rate, access count, and errors.

## Prerequisites

- [Bun](https://bun.sh) (version 1.0 or higher)
- SQLite (for analytics storage)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pdf-merger-api.git
   cd pdf-merger-api
   ```

2. Install the dependencies:

   ```bash
   bun install
   ```

3. Set up the database:

   ```bash
   # Generate Prisma client
   bun run prisma:generate

   # Run migrations
   bun run prisma:migrate
   ```

4. Configure environment variables (optional):

   Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Available variables:
   - `PORT`: Server port (default: 3000)
   - `REQUEST_TIMEOUT`: Timeout for PDF downloads in milliseconds (default: 10000)
   - `DATABASE_URL`: Database connection string (required)
   - `DATABASE_PROVIDER`: Database type - `sqlite`, `postgresql`, or `mysql` (default: sqlite)
   - `NODE_ENV`: Environment - `development`, `production`, or `test` (default: development)
   - `ANALYTICS_API_TOKEN`: Token for accessing the analytics dashboard
     - Default (dev): `dev-token-change-me-in-production-min32chars`
     - ⚠️ **IMPORTANT**: Minimum 32 characters required. Change this in production!
     - Generate with: `openssl rand -hex 32`

### Environment Validation

This project uses **Zod** for type-safe environment variable validation. All environment variables are validated at startup, ensuring:

- ✅ **Type Safety**: TypeScript knows the exact types of all env vars
- ✅ **Runtime Validation**: Invalid values are caught immediately with clear error messages
- ✅ **Default Values**: Sensible defaults for development
- ✅ **Security**: Required minimum lengths for sensitive values like API tokens

**Example validation error:**

```bash
❌ Invalid environment variables:
{
  formErrors: [],
  fieldErrors: {
    ANALYTICS_API_TOKEN: [ 'ANALYTICS_API_TOKEN must be at least 32 characters' ]
  }
}
Error: Invalid environment variables
```

**Skipping validation** (useful for Docker builds):

```bash
SKIP_ENV_VALIDATION=true bun run build
```

## Usage

1. Start the server:

   ```bash
   bun start
   ```

2. The server will run on port 3000 by default. You can access the API at `http://localhost:3000`.

### Database Configuration

This project supports **SQLite** (default), **PostgreSQL**, and **MySQL**.

#### Using SQLite (Default)

No additional setup required. The database file will be created automatically at `./prisma/analytics.db`.

#### Using PostgreSQL

1. Update your `.env`:

   ```bash
   DATABASE_PROVIDER=postgresql
   DATABASE_URL="postgresql://user:password@localhost:5432/analytics?schema=public"
   ```

2. Create the database and run migrations:

   ```bash
   createdb analytics
   rm -rf prisma/migrations
   bun run prisma:migrate
   ```

#### Using MySQL

1. Update your `.env`:

   ```bash
   DATABASE_PROVIDER=mysql
   DATABASE_URL="mysql://user:password@localhost:3306/analytics"
   ```

2. Create the database and run migrations:

   ```sql
   CREATE DATABASE analytics;
   ```

   ```bash
   rm -rf prisma/migrations
   bun run prisma:migrate
   ```

**Note:** When switching database providers:

1. Update `DATABASE_PROVIDER` and `DATABASE_URL` in `.env`
2. Delete the `prisma/migrations` directory
3. Run `bun run prisma:migrate` to create new migrations for the target database

### Analytics Dashboard

Access the analytics dashboard at `http://localhost:3000/dashboard`

**Authentication:**

- **Development**: Use the default token `dev-token-change-me-in-production-min32chars`
- **Production**: Set a secure token with `ANALYTICS_API_TOKEN` environment variable
- Login by entering the token in the dashboard login page

**Features:**

- **Overview Tab**: View download statistics by status code
- **Top URLs Tab**: See most accessed PDF URLs with success rates
- **Error Tracking Tab**: Monitor failed downloads and error messages

### API Endpoints

#### POST /

Merge multiple PDF files.

- **Request Body**: JSON object with the following fields:
  - `title` (string): Title of the merged PDF.
  - `author` (string, optional): Author of the merged PDF.
  - `subject` (string, optional): Subject of the merged PDF.
  - `keywords` (array of strings, optional): Keywords for the merged PDF.
  - `sources` (array of strings): URLs of the PDF files to merge.

- **Response**: The merged PDF file.

**Example Request with `curl`:**

```bash
curl -X POST http://localhost:3000/ \
-H "Content-Type: application/json" \
-d '{
  "title": "merged-document",
  "author": "John Doe",
  "subject": "Merged PDF",
  "keywords": ["pdf", "merge", "example"],
  "sources": [
    "https://example.com/file1.pdf",
    "https://example.com/file2.pdf"
  ]
}'
```

#### GET /health

Check the health status of the server.

- **Response**: A simple message indicating the server is healthy.

## CLI Usage

The project includes a command-line interface for merging PDFs directly from your terminal.

### Running the CLI

#### Using Bun directly

```bash
# Build the project first
bun run build

# Run the CLI
bun cli <input_file_or_directory> [output.pdf]
```

#### Using Docker

```bash
# Build the Docker image
docker build -t merger-pdf .

# Run the CLI using the helper command
docker run -v $(pwd):/data merger-pdf merge-pdf /data/input /data/output.pdf
```

## Docker Deployment

### Environment Variables in Docker

**Important:** Environment variables like `ANALYTICS_API_TOKEN` should be passed at **runtime** using `docker run --env` or `--env-file`, not baked into the image during build.

This is because:
- 🔒 **Security**: Tokens should not be committed to images
- 🔄 **Flexibility**: Same image can be used in different environments
- ✅ **Validation**: Zod validates env vars when the container starts

The Dockerfile uses `SKIP_ENV_VALIDATION=true` during the build process since environment variables are not yet available. Validation happens when you start the container.

### Running the API Server with Docker

To run the API server with analytics support, use the `DB_PROVIDER` build argument to select your database:

```bash
# Build for SQLite (default)
docker build -f docker/Dockerfile -t merger-pdf .
# Or explicitly:
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=sqlite -t merger-pdf .

# Build for PostgreSQL
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=postgresql -t merger-pdf:postgres .

# Build for MySQL
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=mysql -t merger-pdf:mysql .
```

**Running with SQLite:**

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/prisma:/app/prisma \
  -e DATABASE_URL="file:./prisma/analytics.db" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here" \
  -e REQUEST_TIMEOUT=30000 \
  --name merger-pdf-api \
  merger-pdf
```

**Running with PostgreSQL:**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/analytics" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here" \
  --name merger-pdf-api \
  merger-pdf:postgres
```

**Running with MySQL:**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:password@host.docker.internal:3306/analytics" \
  -e ANALYTICS_API_TOKEN="your-secure-token-here" \
  --name merger-pdf-api \
  merger-pdf:mysql
```

> **Note**: Database migrations run automatically when the container starts. No manual migration steps needed!

### Important Docker Considerations

1. **Automatic Migrations**:
   - Database migrations run automatically on container startup
   - No manual steps required - just start the container!

2. **Database Volume Mapping** (SQLite only):
   - Map `./prisma` to `/app/prisma` to persist the SQLite database
   - Without this, analytics data will be lost when the container restarts
   - Not needed for PostgreSQL/MySQL (data is in external database)

3. **Environment Variables**:
   - `DATABASE_URL`: Database connection string (required)
   - `ANALYTICS_API_TOKEN`: Auth token (default: `dev-token-change-me-in-production-min32chars`)
   - `REQUEST_TIMEOUT`: PDF download timeout in ms (default: 30000)

4. **Quick Restart** (your example):

   ```bash
   docker stop merger-pdf && \
   docker rm merger-pdf && \
   docker run -d \
     --name merger-pdf \
     -p 3333:3000 \
     --log-opt max-size=10m \
     aguinaldotupy/merger-pdf:v3.0.1
   ```

   Migrations will run automatically on startup! ✅

### Docker Compose Examples

**SQLite (default):**

```yaml
version: '3.8'
services:
  merger-pdf:
    build:
      context: .
      dockerfile: docker/Dockerfile
      args:
        DB_PROVIDER: sqlite
    ports:
      - "3000:3000"
    volumes:
      - ./prisma:/app/prisma
    environment:
      - DATABASE_URL=file:./prisma/analytics.db
      - ANALYTICS_API_TOKEN=your-secure-token-here
      - REQUEST_TIMEOUT=30000
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
      - ANALYTICS_API_TOKEN=your-secure-token-here
      - REQUEST_TIMEOUT=30000
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

### CLI Examples

**Merge all PDFs in a directory:**

```bash
# Using Bun
bun cli ./pdfs merged-output.pdf

# Using Docker
docker run -v $(pwd):/data merger-pdf merge-pdf /data/pdfs /data/merged-output.pdf
```

**Merge a single PDF file:**

```bash
# Using Bun
bun cli ./document.pdf output.pdf

# Using Docker
docker run -v $(pwd):/data merger-pdf merge-pdf /data/document.pdf /data/output.pdf
```

**Auto-generate output filename:**

```bash
# If you don't specify an output filename, a UUID-based name will be generated
bun cli ./pdfs
```

### CLI Arguments

- `<input_file_or_directory>` (required): Path to a PDF file or directory containing PDF files
- `[output.pdf]` (optional): Output filename. If not provided, a UUID-based filename will be generated

## Error Handling

- The API returns a 400 status code for invalid request bodies.
- A 500 status code is returned for internal server errors.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.
