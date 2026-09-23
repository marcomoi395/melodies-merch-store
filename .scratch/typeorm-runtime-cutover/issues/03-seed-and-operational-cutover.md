Type: task
Status: open

Blocked by: 01-typeorm-adoption-and-single-datasource

## Goal

Replace Prisma seed/build/deployment workflows with TypeORM-owned commands and document the final cutover/rollback runbook.

## Acceptance Criteria

- Idempotent TypeORM seed preserves current base data and works on a fresh migrated database.
- Build has no Prisma generation step and clean install has no Prisma dependency.
- Local, CI, deployment, ERD, contributor, test, and adoption documentation uses TypeORM only.
- Runbook covers backups, baseline ledger, preflight, migration/seed/startup order, smoke tests, abort conditions, and application-only rollback.
- No executable or generated Prisma artifact remains in the working tree.

## Notes

Historical Git/tracker records may mention Prisma. Active source, package metadata, lockfile, scripts, config, docs, and generated output may not.
