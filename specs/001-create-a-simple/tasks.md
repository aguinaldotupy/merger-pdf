# Tasks: PDF Download Analytics Dashboard

**Input**: Design documents from `/specs/001-create-a-simple/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Constitution**: See `.specify/memory/constitution.md` - verify compliance during implementation

**Tests**: Per constitution, tests are OPTIONAL but RECOMMENDED for new features, bug fixes, complex error handling, and changes affecting both API and CLI interfaces.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **All source code in src/**: Backend (`src/analytics/`, `src/dashboard/`), Frontend (`src/dashboard-ui/`)
- **Prisma schema**: `prisma/schema.prisma`
- **Tests** (optional): `tests/integration/`, `tests/contract/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure needed by all features

- [ ] T001 Install Prisma dependencies in package.json: `@prisma/client` and `prisma` (dev)
- [ ] T002 Initialize Prisma with SQLite: Run `npx prisma init --datasource-provider sqlite`
- [ ] T003 Create Prisma schema at prisma/schema.prisma with DownloadEvent model (per data-model.md)
- [ ] T004 Add environment variables to .env: DATABASE_URL and ANALYTICS_API_TOKEN
- [ ] T005 Generate secure API token and document in .env.example with instructions
- [ ] T006 Run initial Prisma migration: `npx prisma migrate dev --name init`
- [ ] T007 [P] Add analytics.db and .env to .gitignore
- [ ] T008 [P] Initialize dashboard frontend project at src/dashboard-ui/ with Vite + React + TypeScript
- [ ] T009 Configure Vite at src/dashboard-ui/vite.config.ts with API proxy to backend
- [ ] T010 [P] Update main package.json build script to compile backend and frontend
- [ ] T011 [P] Update Dockerfile to include dashboard build and Prisma setup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T012 Create Prisma client singleton at src/analytics/prisma-client.ts
- [ ] T013 Create analytics service base class at src/analytics/service.ts with Prisma connection
- [ ] T014 [P] Create authentication middleware at src/dashboard/auth-middleware.ts (validates X-API-Token header)
- [ ] T015 [P] Create base dashboard routes file at src/dashboard/routes.ts with Express router setup
- [ ] T016 Modify src/index.ts to import and register dashboard routes with auth middleware
- [ ] T017 Add /api/analytics/health endpoint to verify database connection
- [ ] T018 [P] Create frontend API client base at src/dashboard-ui/src/services/api.ts with token injection
- [ ] T019 [P] Create frontend auth service at src/dashboard-ui/src/services/auth.ts for token management
- [ ] T020 [P] Create AuthGuard component at src/dashboard-ui/src/components/AuthGuard.tsx for route protection

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Secure Dashboard Access (Priority: P1) 🔒 SECURITY

**Goal**: Implement authentication to protect analytics data from unauthorized access

**Why First**: Security is non-negotiable and blocks all other dashboard features. Must be in place before any data is exposed.

**Independent Test**: Attempt dashboard access without token (denied), with invalid token (denied), with valid token (granted)

### Implementation for User Story 4

- [ ] T021 [US4] Implement token validation logic in src/dashboard/auth-middleware.ts
- [ ] T022 [US4] Add 401 error handling with appropriate response format in auth middleware
- [ ] T023 [US4] Apply auth middleware to all /api/analytics/* routes in src/dashboard/routes.ts
- [ ] T024 [US4] Apply auth middleware to /dashboard route for frontend access
- [ ] T025 [US4] Implement login UI in src/dashboard-ui/src/components/AuthGuard.tsx (token input form)
- [ ] T026 [US4] Store token in React state (memory only, not localStorage) in auth service
- [ ] T027 [US4] Implement auto token injection in API client for all requests
- [ ] T028 [US4] Add error handling for 401 responses to redirect to login

**Checkpoint**: Authentication complete - dashboard is now secure and ready for analytics features

---

## Phase 4: User Story 1 - View Download Activity Overview (Priority: P1) 🎯 MVP CORE

**Goal**: Display download activity statistics grouped by HTTP status code

**Why This Priority**: Core value proposition - operational visibility into service health

**Independent Test**: Make PDF downloads with various status codes, verify dashboard shows correct counts grouped by status

### Implementation for User Story 1

- [ ] T029 [US1] Add analytics recording method to src/analytics/service.ts (recordDownloadEvent)
- [ ] T030 [US1] Create analytics middleware at src/analytics/middleware.ts to capture request/response data
- [ ] T031 [US1] Register analytics middleware in src/index.ts AFTER routes but BEFORE response sent
- [ ] T032 [US1] Implement fire-and-forget pattern in middleware (don't await, catch errors)
- [ ] T033 [US1] Modify src/index.ts POST / route to trigger analytics recording after PDF merge
- [ ] T034 [US1] Add GET /api/analytics/overview endpoint in src/dashboard/routes.ts
- [ ] T035 [US1] Implement overview query method in src/analytics/service.ts (groupBy statusCode)
- [ ] T036 [US1] Add status code categorization logic (2xx, 3xx, 4xx, 5xx) in service
- [ ] T037 [US1] Create StatsOverview component at src/dashboard-ui/src/components/StatsOverview.tsx
- [ ] T038 [US1] Implement data fetching in StatsOverview using API client
- [ ] T039 [US1] Display status code summary with counts in StatsOverview component
- [ ] T040 [US1] Add zero-state messaging when no data exists
- [ ] T041 [US1] Integrate StatsOverview into main App.tsx
- [ ] T042 [US1] Add refresh functionality (manual button) to reload statistics

**Checkpoint**: MVP is functional - can record and view basic analytics

---

## Phase 5: User Story 2 - Identify Most Accessed Resources (Priority: P2)

**Goal**: Show ranked list of most frequently accessed URLs

**Why This Priority**: Useful for capacity planning but not critical for initial operations

**Independent Test**: Make downloads with different URL frequencies, verify dashboard ranks them correctly

### Implementation for User Story 2

- [ ] T043 [US2] Add GET /api/analytics/top-urls endpoint with limit query parameter in src/dashboard/routes.ts
- [ ] T044 [US2] Implement topUrls query method in src/analytics/service.ts (groupBy url, orderBy count)
- [ ] T045 [US2] Add validation for limit parameter (1-1000, default 25) in route handler
- [ ] T046 [US2] Calculate access counts, success rates per URL in query
- [ ] T047 [US2] Create TopUrls component at src/dashboard-ui/src/components/TopUrls.tsx
- [ ] T048 [US2] Implement data fetching with configurable limit in TopUrls
- [ ] T049 [US2] Display URL table with columns: URL, Access Count, Success Rate, Last Accessed
- [ ] T050 [US2] Add URL truncation/tooltip for long URLs
- [ ] T051 [US2] Integrate TopUrls component into main App.tsx below StatsOverview
- [ ] T052 [US2] Add limit selector (10/25/50) in TopUrls UI

**Checkpoint**: Top URLs tracking complete and independently functional

---

## Phase 6: User Story 3 - Track Error Patterns (Priority: P2)

**Goal**: Identify problematic URLs with high error rates

**Why This Priority**: Critical for reliability but can be built after basic monitoring

**Independent Test**: Trigger error conditions, verify dashboard shows error counts and problematic URLs

### Implementation for User Story 3

- [ ] T053 [US3] Add GET /api/analytics/errors endpoint with limit and groupBy parameters in src/dashboard/routes.ts
- [ ] T054 [US3] Implement errorTracking query method in src/analytics/service.ts (filter statusCode >= 400)
- [ ] T055 [US3] Add support for groupBy=event (individual errors) and groupBy=url (aggregated) modes
- [ ] T056 [US3] Include error message, timestamp, status code in response
- [ ] T057 [US3] Create ErrorTracking component at src/dashboard-ui/src/components/ErrorTracking.tsx
- [ ] T058 [US3] Implement data fetching with groupBy toggle in ErrorTracking
- [ ] T059 [US3] Display error table with columns: URL, Status Code, Count, Last Error, Error Message
- [ ] T060 [US3] Add 4xx vs 5xx categorization visual indicator (color coding)
- [ ] T061 [US3] Integrate ErrorTracking component into main App.tsx below TopUrls
- [ ] T062 [US3] Add error message truncation with expandable details

**Checkpoint**: All three user stories (US1, US2, US3) independently functional

---

## Phase 7: Integration & Cross-Story Features

**Purpose**: Features that connect multiple user stories or affect the entire dashboard

- [ ] T063 Add auto-refresh functionality (every 30 seconds) to main App.tsx
- [ ] T064 Add last-updated timestamp display in dashboard header
- [ ] T065 Add loading states (spinners) for all API calls across all components
- [ ] T066 Add error state handling (toast/banner) for failed API requests
- [ ] T067 [P] Implement dashboard layout/grid in App.tsx for responsive design
- [ ] T068 [P] Add dashboard title and branding in header
- [ ] T069 Enable SQLite WAL mode in prisma-client.ts for better concurrency
- [ ] T070 Add request logging in analytics middleware for debugging
- [ ] T071 Add performance monitoring (response time tracking) in analytics service

---

## Phase 8: Production Readiness

**Purpose**: Deployment, build optimization, and production concerns

- [ ] T072 Update .env.example with all required variables and instructions
- [ ] T073 Add DATABASE_URL validation at startup in src/index.ts
- [ ] T074 Add ANALYTICS_API_TOKEN validation at startup (min 32 chars)
- [ ] T075 Configure Express to serve dashboard static files from src/dashboard-ui/dist/
- [ ] T076 Update build script in package.json to build both backend and frontend
- [ ] T077 Test production build: `bun run build && bun run serve`
- [ ] T078 Add POST /api/analytics/event endpoint for internal/testing use
- [ ] T079 Verify analytics recording works on both Bun and Node.js runtimes
- [ ] T080 [P] Update README.md with analytics dashboard documentation
- [ ] T081 [P] Add analytics section to CLAUDE.md with architecture notes

---

## Phase 9: Polish & Documentation

**Purpose**: Final improvements and documentation

- [ ] T082 [P] Run Biome linting on all new TypeScript files: `bun run lint`
- [ ] T083 [P] Fix any linting issues (indentation, quotes, imports)
- [ ] T084 Verify TypeScript strict mode compliance in all new files
- [ ] T085 Add inline comments for non-obvious logic (Why, not What)
- [ ] T086 [P] Test dashboard on both desktop and mobile viewports
- [ ] T087 [P] Verify all API endpoints return consistent error response format
- [ ] T088 Add database backup instructions to quickstart.md
- [ ] T089 Document token rotation procedure in quickstart.md
- [ ] T090 Run manual testing checklist from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 4 (Phase 3)**: Depends on Foundational - MUST complete before other user stories
- **User Story 1 (Phase 4)**: Depends on US4 (authentication) - MVP core functionality
- **User Story 2 (Phase 5)**: Depends on Foundational only - Can be done in parallel with US1 after auth
- **User Story 3 (Phase 6)**: Depends on Foundational only - Can be done in parallel with US1/US2 after auth
- **Integration (Phase 7)**: Depends on all user stories being complete
- **Production (Phase 8)**: Depends on Integration
- **Polish (Phase 9)**: Depends on Production

### User Story Dependencies

- **User Story 4 (P1 - Auth)**: MUST complete first - blocks all dashboard features
- **User Story 1 (P1 - Overview)**: Can start after US4 - No dependencies on other stories
- **User Story 2 (P2 - Top URLs)**: Can start after US4 - Independent of US1/US3
- **User Story 3 (P2 - Errors)**: Can start after US4 - Independent of US1/US2

**Critical Path**: Setup → Foundational → US4 (Auth) → US1 (MVP) → Integration → Production → Polish

**Parallel Opportunities**: After US4 completes, US1, US2, and US3 can be developed in parallel by different developers

### Within Each User Story

- Tasks within same file: Sequential
- Tasks marked [P]: Can run in parallel (different files)
- Analytics service methods before API endpoints
- API endpoints before frontend components
- Frontend components before integration into App

### Parallel Opportunities

**Setup Phase** (all can run in parallel):
- T001-T002 (Prisma setup)
- T007 (gitignore)
- T008-T009 (Frontend init)
- T010-T011 (Build config)

**Foundational Phase** (some parallel):
- T012-T013 (Analytics base) || T014-T015 (Dashboard routes) || T018-T020 (Frontend base)
- Then T016-T017 (Integration) sequentially

**User Story 1**:
- T029-T032 (Analytics recording) parallel with T037-T042 (Frontend)
- Then T033-T036 (API endpoints) must complete before frontend integration

**Across User Stories** (after US4):
- US1 Phase 4 || US2 Phase 5 || US3 Phase 6 (all can proceed in parallel)

---

## Parallel Example: After Foundational Complete

Once Phase 2 (Foundational) is done, launch multiple story teams:

```bash
# Team/Agent 1: User Story 4 (Authentication) - MUST COMPLETE FIRST
Tasks: T021-T028

# After US4 completes, launch in parallel:

# Team/Agent A: User Story 1 (Overview)
Tasks: T029-T042

# Team/Agent B: User Story 2 (Top URLs)
Tasks: T043-T052

# Team/Agent C: User Story 3 (Error Tracking)
Tasks: T053-T062
```

---

## Implementation Strategy

### MVP First (Minimal Viable Product)

**Priority 1: Security + Core Analytics**
1. Complete Phase 1: Setup (T001-T011)
2. Complete Phase 2: Foundational (T012-T020)
3. Complete Phase 3: US4 Authentication (T021-T028)
4. Complete Phase 4: US1 Overview (T029-T042)
5. **STOP and VALIDATE**: Test US1 independently
6. Deploy/demo if ready

**This gives you**: Secure dashboard with basic analytics visibility (MVP!)

### Incremental Delivery

After MVP, add features incrementally:

1. **MVP** (US4 + US1): Secure dashboard with status code overview
2. **v1.1** (+ US2): Add top URLs tracking
3. **v1.2** (+ US3): Add error pattern analysis
4. **v1.3** (Integration + Production): Polish and production readiness

Each version is independently deployable and adds value.

### Parallel Team Strategy

With multiple developers after Foundational phase:

1. **Week 1**: Everyone completes Setup + Foundational
2. **Week 2 Day 1**: One person does US4 (Auth) - BLOCKS others
3. **Week 2 Day 2-5**: After US4 done:
   - Developer A: US1 (Overview)
   - Developer B: US2 (Top URLs)
   - Developer C: US3 (Error Tracking)
4. **Week 3**: Integration, Production, Polish

---

## Task Checklist Summary

- **Total Tasks**: 90
- **Setup**: 11 tasks
- **Foundational**: 9 tasks (blocking)
- **User Story 4 (Auth)**: 8 tasks - CRITICAL PATH
- **User Story 1 (Overview)**: 14 tasks - MVP CORE
- **User Story 2 (Top URLs)**: 10 tasks
- **User Story 3 (Errors)**: 10 tasks
- **Integration**: 9 tasks
- **Production**: 10 tasks
- **Polish**: 9 tasks

**Parallel Opportunities**: 25+ tasks can be done in parallel across phases

**Independent Test Criteria**:
- US4: Can authenticate/reject access independently
- US1: Can record and display basic stats independently
- US2: Can show top URLs independently
- US3: Can track errors independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label (US1, US2, US3, US4) maps task to specific user story
- Each user story should be independently completable and testable
- Tests are OPTIONAL per constitution (manual testing is primary)
- Commit after each completed task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies
