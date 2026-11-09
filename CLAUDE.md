# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDF Merger API is a TypeScript application that provides both an HTTP API and CLI tool for merging multiple PDF files. It supports both local file operations and remote PDF downloads via URLs.

**Primary runtime**: Bun is the preferred runtime (see Dockerfile and bun.lock). Node.js (>=22.22.2) is also supported.

## Development Commands

### Building and Running
```bash
# Development - prefer Bun
bun start  # or: bun run src/index.ts
# Alternative with Node: npm start (uses ts-node)

# Build TypeScript to JavaScript
bun run build  # or: npm run build

# Production - run compiled code
bun run serve  # or: bun dist/index.js
# Alternative with Node: npm run serve

# CLI tool (after build)
bun cli <input> [output.pdf]  # or: bun dist/merge-cli.js
```

### Code Quality
```bash
# Lint and auto-fix with Biome
bun run lint        # --write --unsafe
bun run lint:fix    # --write only

# Biome configuration:
# - Tab indentation
# - Double quotes for JavaScript/TypeScript
# - Recommended linting rules enabled
# - Import organization enabled
```

### Release Management
```bash
bun run release  # Uses semantic-release
```

**Semantic Release Configuration** (`release.config.cjs`):
- **Branches**: `main` (production), `stage` (prerelease channel)
- **Commit Convention**: Angular preset with custom rules:
  - `feat:` → minor version bump
  - `refactor:` → patch version bump
  - `style:` → patch version bump
  - Breaking changes (`!`) → major version bump
- **Automated updates**: CHANGELOG.md, package.json, bun.lock
- **NPM**: Does not publish to npm registry (`npmPublish: false`)
- **GitHub**: Creates releases with `dist/**/*` files attached
- **Workflow integration**: Sets GitHub Actions outputs (new_release_published, new_release_version, version)

## Architecture

### Core Components

**PDFMerger** (`src/pdf-merger.ts`): The central class for all PDF operations
- Factory pattern: Use `PDFMerger.create()` to instantiate
- Wraps `pdf-lib`'s `PDFDocument` with a cleaner API
- Supports three input methods: file path, URL, or buffer
- HTTPS agent configured with `rejectUnauthorized: false` for URL downloads
- Configurable request timeout via `REQUEST_TIMEOUT` env var (default: 10s)

**Express API** (`src/index.ts`): HTTP server for PDF merging
- POST `/`: Merge PDFs from URLs
  - Downloads all sources in parallel using `Promise.all`
  - Maintains original source order despite parallel downloads
  - Gracefully handles partial failures (skips failed downloads)
  - Returns merged PDF as download, then cleans up temp file
- GET `/health`: Health check endpoint
- Port: `PORT` env var or 3000

**CLI Tool** (`src/merge-cli.ts`): Command-line interface
- Accepts file path or directory as input
- Auto-generates UUID-based filename if output not specified
- Directory mode: merges all `.pdf` files found

**Utilities** (`src/utils.ts`):
- `toSlug()`: Converts strings to URL-safe slugs
- `uuidv4()`: Simple UUID v4 generator (custom implementation)

### Key Design Patterns

1. **Parallel downloads with ordered processing**: The API downloads PDFs concurrently but adds them to the merger in the original order by tracking index with each download result.

2. **Error resilience**: Failed PDF downloads/additions are logged but don't crash the entire merge operation.

3. **Temporary file management**: Merged PDFs are written to disk with UUID filenames, sent via Express `res.download()`, then immediately deleted in the callback.

4. **Factory pattern**: `PDFMerger.create()` instead of `new PDFMerger()` because PDFDocument creation is async.

## Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `REQUEST_TIMEOUT`: Axios timeout in milliseconds for URL downloads (default: 10000)
- `NODE_TLS_REJECT_UNAUTHORIZED`: SSL certificate validation (default: "1" - enabled)
  - Set to "0" to disable SSL certificate validation (use only for development/trusted URLs)
  - Set to "1" or omit for production (enables full SSL validation)


## Docker

`docker/Dockerfile` is a two-stage build on `oven/bun:1.4.4-alpine`:
- `builder`: installs all dependencies, runs `docker/setup-prisma-provider.sh` for the `DB_PROVIDER` build arg, generates the Prisma client and compiles TypeScript
- `runtime`: `bun install --frozen-lockfile --production --omit=peer` plus `dist/`, the generated client (`node_modules/.prisma`), the provider-adjusted `prisma/` schema and `src/dashboard-ui`; semantic-release, biome, typescript and ts-node are not in the image
- `prisma` (CLI) is a runtime dependency because `docker-entrypoint.sh` runs `prisma db push --skip-generate` on start-up
- Runs as the unprivileged `bun` user (uid 1000); only `/app/database` and `/app/batch-storage` are writable, merged PDFs go to the OS temp dir (`os.tmpdir()`)
- Declares a `HEALTHCHECK` on `/health` and provides the CLI wrapper at `/usr/local/bin/merge-pdf`
- Run CLI: `docker run -v $(pwd):/data merger-pdf merge-pdf /data/input /data/output.pdf`
- `.github/workflows/docker-build-check.yml` builds the image on pull requests and smoke-tests it (health, non-root, no dev tooling, CLI and HTTP merge)

## TypeScript Configuration

- Target: ES6
- Module: CommonJS
- Strict mode enabled
- Output: `dist/` directory
- Source: `src/` directory
