## [4.7.1](https://github.com/aguinaldotupy/merger-pdf/compare/v4.7.0...v4.7.1) (2025-12-16)

# [4.7.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.6.0...v4.7.0) (2025-12-16)


### Features

* **prisma:** add migration for pdf_processing_events table ([0d1c6b6](https://github.com/aguinaldotupy/merger-pdf/commit/0d1c6b62588d0cda6a1eb6f4eb43730d77276d0b))

# [4.6.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.5.1...v4.6.0) (2025-12-16)


### Features

* add PDF processing analytics and dashboard tab ([52f7b5c](https://github.com/aguinaldotupy/merger-pdf/commit/52f7b5c83a0a9be0376b7a2d42bb2ce6793ef575))

## [4.5.1](https://github.com/aguinaldotupy/merger-pdf/compare/v4.5.0...v4.5.1) (2025-12-15)


### Bug Fixes

* improve PDF error handling and add ignoreEncryption option ([cd94c11](https://github.com/aguinaldotupy/merger-pdf/commit/cd94c11ae67e57fe9403a17e7b8bdf2b656e8f12))

# [4.5.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.4.0...v4.5.0) (2025-11-10)


### Features

* add axios-retry for improved error handling and retry logic in PDF downloads ([9682561](https://github.com/aguinaldotupy/merger-pdf/commit/9682561c1c688c48198d543f1ba61aed67e0e2bf))

# [4.4.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.3.0...v4.4.0) (2025-10-30)


### Features

* add SSL/TLS configuration support and update agents in PDF merger ([387297c](https://github.com/aguinaldotupy/merger-pdf/commit/387297c7022de73f3241780fc1071df0ae0b3483))

# [4.3.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.2.0...v4.3.0) (2025-10-29)


### Bug Fixes

* differentiate error colors in downloads chart ([892b24d](https://github.com/aguinaldotupy/merger-pdf/commit/892b24de01d6c71437475b75230f5b05afa145c3)), closes [#f97316](https://github.com/aguinaldotupy/merger-pdf/issues/f97316) [#ef4444](https://github.com/aguinaldotupy/merger-pdf/issues/ef4444)
* match stat card colors with chart line colors ([9e059fc](https://github.com/aguinaldotupy/merger-pdf/commit/9e059fcf90d020f3495198b46e154fd3cc9e2c9a)), closes [#3b82f6](https://github.com/aguinaldotupy/merger-pdf/issues/3b82f6) [#22c55e](https://github.com/aguinaldotupy/merger-pdf/issues/22c55e) [#f59e0b](https://github.com/aguinaldotupy/merger-pdf/issues/f59e0b) [#f97316](https://github.com/aguinaldotupy/merger-pdf/issues/f97316) [#ef4444](https://github.com/aguinaldotupy/merger-pdf/issues/ef4444)


### Features

* add downloads trend chart with flexible time grouping ([c04b0ff](https://github.com/aguinaldotupy/merger-pdf/commit/c04b0ff6e2b04f783a3584b946befe9ea9f9c638))

# [4.2.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.1.3...v4.2.0) (2025-10-29)


### Features

* add Downloads tab with advanced filtering and sorting ([2f48291](https://github.com/aguinaldotupy/merger-pdf/commit/2f48291c6ff9cdfdff86bd3aeeb3add65e2c4e79))

## [4.1.3](https://github.com/aguinaldotupy/merger-pdf/compare/v4.1.2...v4.1.3) (2025-10-29)


### Bug Fixes

* enhance PDF download process with analytics tracking and error handling ([d527bc5](https://github.com/aguinaldotupy/merger-pdf/commit/d527bc5a3fb34c111a15f9ff5c31baa64a4d3ba8))

## [4.1.2](https://github.com/aguinaldotupy/merger-pdf/compare/v4.1.1...v4.1.2) (2025-10-29)


### Bug Fixes

* improve database readiness check in entrypoint script for better clarity and handling ([f6216e1](https://github.com/aguinaldotupy/merger-pdf/commit/f6216e12c2bcaa6be08ea2eefee085a6d0b33881))

## [4.1.1](https://github.com/aguinaldotupy/merger-pdf/compare/v4.1.0...v4.1.1) (2025-10-29)


### Bug Fixes

* correct command syntax for database readiness check in entrypoint script ([bfe2b48](https://github.com/aguinaldotupy/merger-pdf/commit/bfe2b483acf80586bfb2417da7fe5d598b627083))

# [4.1.0](https://github.com/aguinaldotupy/merger-pdf/compare/v4.0.4...v4.1.0) (2025-10-29)


### Features

* enhance Dockerfile and Prisma setup for dynamic database provider configuration ([3395bb1](https://github.com/aguinaldotupy/merger-pdf/commit/3395bb1518ce3b599015b0ae4d29d2018d51ce4a))

## [4.0.4](https://github.com/aguinaldotupy/merger-pdf/compare/v4.0.3...v4.0.4) (2025-10-29)


### Bug Fixes

* remove DATABASE_PROVIDER environment variable from Dockerfile ([68d79f4](https://github.com/aguinaldotupy/merger-pdf/commit/68d79f4ecbc23412d0d2a92f35bf08a5c6ff9bc8))

## [4.0.3](https://github.com/aguinaldotupy/merger-pdf/compare/v4.0.2...v4.0.3) (2025-10-29)


### Bug Fixes

* update Dockerfile to set DATABASE_URL and REQUEST_TIMEOUT as arguments ([1a7d853](https://github.com/aguinaldotupy/merger-pdf/commit/1a7d85325d69ac3201859caa51c4603c5fefdbcf))

## [4.0.2](https://github.com/aguinaldotupy/merger-pdf/compare/v4.0.1...v4.0.2) (2025-10-28)


### Bug Fixes

* change database provider to a static value in Prisma schema ([15ea73b](https://github.com/aguinaldotupy/merger-pdf/commit/15ea73bd0611d83754c069adbef147ecad942b5d))

## [4.0.1](https://github.com/aguinaldotupy/merger-pdf/compare/v4.0.0...v4.0.1) (2025-10-28)


### Bug Fixes

* add .bumrc and .bun-version files, and update Docker workflow to check Node.js version ([880a7a5](https://github.com/aguinaldotupy/merger-pdf/commit/880a7a5adac4c6bbf07fa8c16c3f20be38256e7a))
* add Node.js setup step to Docker image workflow ([58a270d](https://github.com/aguinaldotupy/merger-pdf/commit/58a270debc13d38286609a6daf116214b7f73b7e))
* reorder Node.js setup step in Docker image workflow ([859122e](https://github.com/aguinaldotupy/merger-pdf/commit/859122eae9c26044c5b9ec4da732b83e11b088fd))
* update Bun version to 1.1.45 and correct lockfile references ([2138c79](https://github.com/aguinaldotupy/merger-pdf/commit/2138c792a752ac3bca90f5628d1bf09aba1c58d1))
* update Node.js version to 25.0.0 in workflow and .tool-versions file ([a7b7346](https://github.com/aguinaldotupy/merger-pdf/commit/a7b7346e048940d8c6982ae63e07b13f319eb9d3))
* update release command to use semantic-release ([b53d9e0](https://github.com/aguinaldotupy/merger-pdf/commit/b53d9e010e53c9f4710431929faf995e291e165b))

# [4.0.0](https://github.com/aguinaldotupy/merger-pdf/compare/v3.0.1...v4.0.0) (2025-10-28)


* feat!: add analytics dashboard with multi-database support ([9a37909](https://github.com/aguinaldotupy/merger-pdf/commit/9a37909afd9f64b818f2a50de1adee6e91b18d1b))


### Bug Fixes

* **ci:** update Docker workflow to use docker/Dockerfile path ([2087778](https://github.com/aguinaldotupy/merger-pdf/commit/2087778dc35fce416a2f58ae5971e3512f113bbf))


### BREAKING CHANGES

* PDF merge endpoint now tracks individual URL downloads instead of POST requests. Analytics dashboard requires authentication token.

## New Features

### Analytics Dashboard
- Web-based dashboard at /dashboard for tracking PDF downloads
- Real-time statistics by status code (2xx, 3xx, 4xx, 5xx)
- Top URLs tracking with success rates and access counts
- Error tracking with detailed error messages and timestamps
- Token-based authentication (default: dev-token-change-me-in-production-min32chars)
- Vanilla JavaScript dashboard (no React/Vite dependencies)
- SessionStorage for token persistence

### Multi-Database Support
- SQLite (default), PostgreSQL, and MySQL support via DATABASE_PROVIDER env var
- Dynamic Prisma schema selection at build time
- Automatic database migrations on Docker container startup
- Docker build args for database provider selection

### Analytics Tracking
- Individual PDF URL tracking (not POST requests)
- Records: URL, status code, response time, user agent, errors
- Fire-and-forget pattern (non-blocking analytics)
- Tracks only PDF downloads, not API/dashboard endpoints

### Docker Improvements
- Organized docker/ directory structure
- Automatic migrations via docker-entrypoint.sh
- Multi-database Docker builds (sqlite, postgresql, mysql)
- Optimized .dockerignore for faster builds
- Dedicated docker/README.md documentation

### SSL/Certificate Handling
- Support for self-signed SSL certificates
- Configured axios with rejectUnauthorized: false
- Compatible with .test domains and internal certificates

## Migration Guide

### Environment Variables
**Required:**
- `DATABASE_PROVIDER`: sqlite, postgresql, or mysql (default: sqlite)
- `DATABASE_URL`: Database connection string

**Optional:**
- `ANALYTICS_API_TOKEN`: Dashboard auth token (default: dev-token-change-me-in-production-min32chars)
- `REQUEST_TIMEOUT`: PDF download timeout in ms (default: 30000)

### Database Setup
```bash
# Install dependencies
bun install

# Generate Prisma client
bun run prisma:generate

# Run migrations
bun run prisma:migrate
```

### Docker Usage
```bash
# Build (SQLite default)
docker build -f docker/Dockerfile -t merger-pdf .

# Build with PostgreSQL
docker build -f docker/Dockerfile --build-arg DB_PROVIDER=postgresql -t merger-pdf:postgres .

# Run with automatic migrations
docker run -d -p 3000:3000 -v $(pwd)/prisma:/app/prisma merger-pdf
```

### Breaking Changes
1. **Analytics tracking**: Now tracks individual PDF URLs, not POST requests
2. **Docker file location**: Dockerfile moved to docker/Dockerfile (use -f flag)
3. **New dependencies**: @prisma/client, prisma (SQLite by default)
4. **Authentication required**: Dashboard requires ANALYTICS_API_TOKEN
5. **Environment variables**: New DATABASE_PROVIDER and DATABASE_URL required

## Technical Details

- **Frontend**: Vanilla HTML/CSS/JS with Shadcn-inspired design
- **Backend**: Express.js with Prisma ORM
- **Database**: SQLite (default), PostgreSQL, MySQL
- **Authentication**: Token-based (X-API-Token header)
- **Analytics**: Non-blocking fire-and-forget recording
- **Migrations**: Automatic on Docker startup

## [3.0.1](https://github.com/aguinaldotupy/merger-pdf/compare/v3.0.0...v3.0.1) (2025-10-13)

# [3.0.0](https://github.com/aguinaldotupy/merger-pdf/compare/v2.0.0...v3.0.0) (2025-10-13)


* feat!: remove contact information from README ([dd0edd2](https://github.com/aguinaldotupy/merger-pdf/commit/dd0edd2e958d0d9d6ebf92e98d000eef650d7b9e))


### BREAKING CHANGES

* Remove contact information from README.md

# [2.0.0](https://github.com/aguinaldotupy/merger-pdf/compare/v1.0.2...v2.0.0) (2025-10-13)


* feat!: upgrade to version 3.0.0 ([1fe642a](https://github.com/aguinaldotupy/merger-pdf/commit/1fe642a320c68f439379a195620b31de5d60b213))


### BREAKING CHANGES

* Major version update to 3.0.0 with architectural improvements and enhanced CI/CD pipeline. This version includes fixes to the GitHub Actions workflow to properly trigger semantic-release on push events.

# [3.0.0](https://github.com/aguinaldotupy/merger-pdf/compare/v1.0.2...v3.0.0) (2025-10-13)


### ⚠ BREAKING CHANGES

* Major version update to 3.0.0 with architectural improvements and workflow enhancements

### Features

* Major version bump to 3.0.0 with improved CI/CD pipeline


## [1.0.2](https://github.com/aguinaldotupy/merger-pdf/compare/v1.0.1...v1.0.2) (2025-10-13)


### Bug Fixes

* update version to 3.0.0 in package.json ([29aac9f](https://github.com/aguinaldotupy/merger-pdf/commit/29aac9f78f2876115e0963881f5974fa92965358))

## [1.0.1](https://github.com/aguinaldotupy/merger-pdf/compare/v1.0.0...v1.0.1) (2025-10-13)


### Bug Fixes

* update workflow trigger to push on main branch and ensure consistent checkout steps ([8bee958](https://github.com/aguinaldotupy/merger-pdf/commit/8bee9581617d059ae43bafddc24934528d3cf81e))

# 1.0.0 (2025-10-13)


### Bug Fixes

* add build step for application in Docker workflow and update version extraction ([38230d8](https://github.com/aguinaldotupy/merger-pdf/commit/38230d83476ab03a24c865575df4e38276967c3b))
* Correct filename generation for merged PDF output ([cd2c7a4](https://github.com/aguinaldotupy/merger-pdf/commit/cd2c7a40c614f70692354dddcf2e995f071b2c42))
* Correct filename in Dockerfile for Bun lock file ([a35f10a](https://github.com/aguinaldotupy/merger-pdf/commit/a35f10a7c001fae4f0fb8ef2e40f0fd041bb5c29))
* remove unnecessary whitespace in index.ts and merge-cli.ts for cleaner code ([8740d4c](https://github.com/aguinaldotupy/merger-pdf/commit/8740d4cd4ad4c2044eb6c2fb9c09bf8693b89652))
* reorder import statements for consistency and update timeout parsing to use Number.parseInt ([d200aa5](https://github.com/aguinaldotupy/merger-pdf/commit/d200aa56ad0847be4bc03688021ca394326983fb))
* Set Bun as the package manager in VSCode settings ([d10b0c8](https://github.com/aguinaldotupy/merger-pdf/commit/d10b0c8a869d89a86bc077d3fc27638cfca17552))
* Update Dockerfile to use Bun for package management and build process; modify GitHub Actions to retrieve version using jq ([a20b994](https://github.com/aguinaldotupy/merger-pdf/commit/a20b99439610e55a619a78597df3040d5d039d20))
* Update GitHub Actions workflow to grant write permissions for contents and packages ([a8b47ae](https://github.com/aguinaldotupy/merger-pdf/commit/a8b47aee163f5f7c1dbbce28313b99cd28f02ea7))
* Update README to reflect Bun usage instead of Node.js for installation and CLI commands ([f3b7222](https://github.com/aguinaldotupy/merger-pdf/commit/f3b72229cee51f18cb8196f8448d8600f8219cab))


### Features

* add CLI helper and update README for CLI usage ([33347da](https://github.com/aguinaldotupy/merger-pdf/commit/33347da5bcdbd8b2a6042d05ad91f36c2d9c72af))
* Add code review workflow with GPT-4o integration ([e3ef8b2](https://github.com/aguinaldotupy/merger-pdf/commit/e3ef8b2f648886bbfb604e5470badaa9451dc298))
* Add release drafter workflow for automated release notes generation ([47fd651](https://github.com/aguinaldotupy/merger-pdf/commit/47fd65147f31a6601e01eae8dec2e7847471dab2))
* add semantic release configuration and dependencies ([d367c88](https://github.com/aguinaldotupy/merger-pdf/commit/d367c882a650e09cd1ab8cb6f406c8bcb6bee156))
* added cli command ([770b692](https://github.com/aguinaldotupy/merger-pdf/commit/770b692dfdf0d3febe99f9b1caf6c9209f61a7ac))
* Enhance MergeRequest interface and add metadata to merged PDF ([0a807c5](https://github.com/aguinaldotupy/merger-pdf/commit/0a807c56007aff57d09f2a931ec3eb943d7ab2d6))
* First commit ([3b563af](https://github.com/aguinaldotupy/merger-pdf/commit/3b563afd055760835e3a8afbb5e8910f1e871afd))
* Improve error handling and add timeout for PDF download ([7864a4d](https://github.com/aguinaldotupy/merger-pdf/commit/7864a4d1ffca7036b4f9615728816cfad11cd7a8))
