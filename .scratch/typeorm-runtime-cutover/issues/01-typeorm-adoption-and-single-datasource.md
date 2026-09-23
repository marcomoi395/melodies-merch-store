Type: task
Status: open

Blocked by: none

## Goal

Remove Prisma from the database adoption path and make the application use one TypeORM DataSource with no ORM-selection flag.

## Acceptance Criteria

- Adoption preflight compares the target PostgreSQL catalog against the TypeORM schema inventory without Prisma packages, config, schema, or CLI.
- Existing-database fake baseline remains non-destructive and idempotent.
- Nest startup registers one TypeORM connection and no Prisma module/service or `TYPEORM_ENABLED` switch.
- Fresh databases migrate through TypeORM only.
- Focused adoption, DataSource, module, and startup tests pass.

## Notes

Use the existing TypeORM migration/entity metadata and disposable PostgreSQL lifecycle. Preserve the current 20-table schema and migration history behavior.
