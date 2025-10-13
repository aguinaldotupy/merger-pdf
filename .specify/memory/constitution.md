<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0
Initial constitution ratification for PDF Merger API project.

Modified Principles: N/A (initial version)
Added Sections: All sections (initial creation)
Removed Sections: None

Templates Updated:
✅ plan-template.md - Added Constitution Check section with detailed compliance checklist
✅ spec-template.md - Added constitution reference to header
✅ tasks-template.md - Updated test requirements to match constitution guidance
⚠ Command templates - No command files found in .specify/templates/commands/

Follow-up TODOs:
- None - all fields populated and templates synchronized
-->

# PDF Merger API Constitution

## Core Principles

### I. Dual-Interface Design

Every feature MUST be accessible through both the HTTP API and CLI interfaces unless technically infeasible. Both interfaces MUST:
- Accept the same core input parameters (file paths, URLs, or buffers)
- Produce equivalent outputs in their respective formats
- Share the same underlying implementation (PDFMerger class)
- Handle errors consistently and gracefully

**Rationale**: Users may prefer programmatic integration (API) or scripting/automation (CLI). Supporting both maximizes utility without duplicating business logic.

### II. Runtime Compatibility

All code MUST run on both Bun (primary) and Node.js (>=20) runtimes. This requires:
- No runtime-specific APIs except where abstracted behind compatibility layers
- Testing critical paths on both runtimes before release
- Documentation clearly indicating runtime-specific behavior if unavoidable
- Dependency choices that work across both environments

**Rationale**: Bun provides superior performance but Node.js ensures broader ecosystem compatibility. Supporting both prevents vendor lock-in.

### III. Error Resilience Over Failure

Operations MUST NOT fail entirely when partial success is achievable. Specifically:
- PDF merge operations skip failed downloads/additions and continue with successful ones
- Errors are logged with sufficient context for debugging
- Operations return partial results with clear indication of what failed
- User receives best-effort output rather than complete failure

**Rationale**: In batch operations (merging multiple PDFs), one failure should not invalidate all successful processing. Graceful degradation improves user experience.

### IV. Code Quality Enforcement

All code contributions MUST pass automated quality gates:
- Biome linting with project configuration (tab indentation, double quotes)
- TypeScript strict mode compilation without errors
- Semantic commit message format (enforced by semantic-release)
- No merge to main without passing checks

**Rationale**: Consistent code quality reduces maintenance burden and prevents technical debt accumulation.

### V. Semantic Versioning Discipline

Version bumps MUST follow strict semantic versioning rules enforced by semantic-release:
- **MAJOR**: Breaking API changes, removed functionality, incompatible behavior changes
- **MINOR**: New features (`feat:` commits), backward-compatible additions
- **PATCH**: Bug fixes, refactors (`refactor:`), style improvements (`style:`)

Commit messages MUST follow Angular convention. Breaking changes MUST use `!` suffix (e.g., `feat!:`).

**Rationale**: Automated versioning prevents human error and provides predictable upgrade paths for API consumers.

### VI. Simplicity and Clarity

Code MUST prioritize readability and maintainability over clever optimizations:
- Avoid unnecessary abstractions (no pattern for pattern's sake)
- Prefer explicit over implicit behavior
- Use descriptive names over comments where possible
- Follow YAGNI (You Aren't Gonna Need It) principle

**Rationale**: The codebase is small (~5 files). Premature abstraction or over-engineering creates cognitive overhead without proportional benefit.

## Technical Standards

### TypeScript Configuration

- **Strict mode**: MUST be enabled (no implicit any, strict null checks)
- **Target**: ES6 minimum for broad runtime compatibility
- **Module**: CommonJS for Node.js interoperability
- **Compilation**: MUST produce clean JavaScript in `dist/` with no errors

### Testing Requirements

Tests are OPTIONAL but RECOMMENDED for:
- New features adding business logic
- Bug fixes addressing regression risks
- Complex error handling paths
- Changes affecting both API and CLI interfaces

When tests are written, they MUST:
- Be independent and runnable in isolation
- Cover both success and error scenarios
- Use clear Given-When-Then structure for readability

### Documentation Standards

- **README.md**: MUST be kept up-to-date with API endpoints, CLI usage, and examples
- **CLAUDE.md**: MUST document architecture, design patterns, and development workflows for AI assistants
- **Inline comments**: Only for non-obvious "why" explanations (not "what" restatements)
- **CHANGELOG.md**: Automatically maintained by semantic-release

## Development Workflow

### Feature Development

1. **Specification**: Create feature spec in `.specify/specs/[feature]/spec.md` using template
2. **Planning**: Generate implementation plan via `/speckit.plan` command
3. **Task Breakdown**: Generate tasks via `/speckit.tasks` command
4. **Implementation**: Follow task order, committing after each logical unit
5. **Validation**: Test both API and CLI interfaces manually or via automated tests
6. **Documentation**: Update README.md examples if user-facing changes made

### Commit Workflow

1. Stage relevant changes: `git add <files>`
2. Write semantic commit message following Angular convention
3. Push to branch
4. Create PR with clear description referencing spec if applicable
5. Semantic-release handles version bump and CHANGELOG on merge to main

### Quality Gates

Before merging to main, code MUST:
- Pass `bun run lint` without errors
- Compile with `bun run build` producing clean JavaScript
- Be manually tested on both Bun and Node.js runtimes if touching core logic
- Include updated documentation if user-facing behavior changed

## Security and Reliability

### HTTPS Handling

API operations downloading PDFs via HTTPS use `rejectUnauthorized: false` for certificate validation. This is a known trade-off for flexibility.

**Mitigation**: Document this behavior in README.md and consider exposing as configurable option in future versions.

### Temporary File Management

Merged PDFs written to disk MUST:
- Use UUID-based filenames to prevent collisions
- Be deleted immediately after sending via Express `res.download()` callback
- Not be retained on error (cleanup in error handlers)

**Rationale**: Prevents disk exhaustion from orphaned temp files.

### Input Validation

API endpoints MUST validate:
- Request body structure matches expected schema
- Source URLs are reachable before attempting merge (fail-fast validation)
- File paths exist and are readable in CLI mode

## Governance

### Amendment Process

Constitution amendments require:
1. Proposal documenting rationale and impact
2. Review for consistency with project goals
3. Update to this file with version bump per semantic versioning rules (see below)
4. Propagation to dependent templates (plan, spec, tasks)
5. Commit message: `docs: amend constitution to vX.Y.Z (description)`

### Constitution Versioning

- **MAJOR**: Principle removal, redefinition, or governance process change that breaks existing workflows
- **MINOR**: New principle added, materially expanded guidance, new mandatory section
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Reviews

Constitution compliance MUST be verified:
- During PR reviews for new features
- When generating implementation plans via `/speckit.plan`
- When accepting feature specifications via `/speckit.specify`

Violations MUST be justified in the "Complexity Tracking" section of plan.md before proceeding.

### Agent Guidance

Claude Code and other AI assistants working with this repository MUST:
- Read CLAUDE.md for development guidance
- Reference this constitution when generating specs, plans, or tasks
- Flag constitution violations and request justification before proceeding
- Update both CLAUDE.md and constitution.md when architectural patterns change

**Version**: 1.0.0 | **Ratified**: 2025-01-13 | **Last Amended**: 2025-01-13
