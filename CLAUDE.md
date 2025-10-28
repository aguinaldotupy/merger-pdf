# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDF Merger API is a TypeScript application that provides both an HTTP API and CLI tool for merging multiple PDF files. It supports both local file operations and remote PDF downloads via URLs.

**Primary runtime**: Bun is the preferred runtime (see Dockerfile and bun.lockb). Node.js (>=20) is also supported.

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
- **Automated updates**: CHANGELOG.md, package.json, bun.lockb
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

## Docker

The Dockerfile uses Bun runtime:
- Base image: `oven/bun:1.1.45-alpine`
- Builds TypeScript to JavaScript during image build
- Provides CLI wrapper at `/usr/local/bin/merge-pdf`
- Run CLI: `docker run -v $(pwd):/data merger-pdf merge-pdf /data/input /data/output.pdf`

## TypeScript Configuration

- Target: ES6
- Module: CommonJS
- Strict mode enabled
- Output: `dist/` directory
- Source: `src/` directory
