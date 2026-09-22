# Isolated TypeORM DataSource and CLI

Type: task
Status: resolved

Implement the shared TypeORM configuration required for an explicitly selected PostgreSQL schema, known migration history table, environment loading for the CLI DataSource, and safe test-target validation. Preserve disabled synchronization and existing Prisma runtime wiring.

## Acceptance Criteria

- The DataSource accepts an explicit schema option.
- Database-test setup creates and selects a unique isolated schema; it never relies on a URL query parameter alone.
- The migration-history table has a configured name available to tests.
- CLI DataSource loads documented local environment configuration.
- Missing configuration fails with a non-zero command status.
- Focused configuration tests pass.

## Comments

Derived from `../spec.md`.

## Answer

Implemented and merged. The shared DataSource now selects an explicit test schema, uses a named migration-history table, loads environment configuration for the CLI, and validates dedicated database targets.
