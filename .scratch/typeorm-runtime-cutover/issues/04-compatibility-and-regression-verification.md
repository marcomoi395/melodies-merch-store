Type: task
Status: open

Blocked by: 02-feature-services-to-typeorm, 03-seed-and-operational-cutover

## Goal

Prove the cutover is final through one TypeORM-only API/database seam and a zero-active-Prisma guard.

## Acceptance Criteria

- Disposable PostgreSQL API e2e covers representative identity, authorization, catalog, cart, order, promotion, and content behavior.
- Fresh migration/seed, existing-schema adoption, rollback, transaction failure, and representative persisted state are verified.
- Clean install, build, unit tests, API e2e, database suite, and cutover rehearsal pass without Prisma.
- A guard fails on Prisma imports, packages, commands, generated paths, or runtime flags in active project files.
- Final evidence records baseline readiness for every deploy target.

## Notes

Assert external API/database behavior rather than repository method calls. Reuse the existing disposable PostgreSQL lifecycle and API test setup.
