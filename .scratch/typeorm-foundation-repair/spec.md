# Repair and Complete the Prisma-to-TypeORM Persistence Foundation

Status: resolved

## Problem Statement

The Melodies Merch Store has introduced a TypeORM persistence foundation, but it is not yet safe or complete enough to support the later migration of feature services away from Prisma.

The metadata-only database tests pass, while the PostgreSQL-backed migration, schema-parity, and adoption suites are skipped unless a test database is supplied. When those suites run against a clean disposable PostgreSQL database, all three fail. The current test URL does not select an isolated PostgreSQL schema through TypeORM, migration-history tables are counted as domain tables, and the adoption rehearsal assumes an existing schema without provisioning one.

The TypeORM entity model also does not preserve Prisma's automatic update-timestamp behavior. Existing-database adoption is described conceptually but does not provide or verify an executable baseline operation. The TypeORM CLI does not load the repository's documented environment file by itself. Finally, the application, deployment workflow, seed process, and feature services remain Prisma-backed, so the repository is in a dual-ORM foundation phase rather than a completed ORM replacement.

## Solution

Repair the TypeORM foundation before beginning feature-service rewrites.

Provide one real, disposable PostgreSQL verification seam that creates an isolated target, applies the authoritative Prisma schema when testing adoption, runs complete schema preflight checks, records the initial TypeORM migration as an already-applied baseline, verifies migration history, exercises clean-database migration and rollback, and cleans up reliably.

Make TypeORM entity behavior preserve the application-managed defaults currently supplied by Prisma, especially automatic update timestamps. Make CLI commands load documented environment configuration and fail with a non-zero status when configuration or migration execution fails. Keep Prisma runtime wiring until feature modules are migrated, but describe this state accurately as a transitional dual-ORM foundation.

## User Stories

1. As a backend engineer, I want database tests to create an isolated PostgreSQL target, so that running the suite cannot modify application data.
2. As a backend engineer, I want isolation configured through TypeORM's PostgreSQL options, so that the selected schema is actually used.
3. As a backend engineer, I want the isolated schema or database created before migrations run, so that tests do not silently fall back to `public`.
4. As a backend engineer, I want every database suite to own its setup and cleanup, so that test order does not affect results.
5. As a CI maintainer, I want cleanup to run after both successful and failed tests, so that stale schemas do not poison later jobs.
6. As a CI maintainer, I want database tests to refuse shared or application database targets, so that misconfiguration fails safely.
7. As a backend engineer, I want the initial TypeORM migration to run successfully on an empty PostgreSQL database, so that new environments can be provisioned.
8. As a backend engineer, I want migration-history tables excluded explicitly from domain-table assertions, so that successful TypeORM bookkeeping does not fail table counts.
9. As a backend engineer, I want running the migration twice to apply it only once, so that deployment retries are safe.
10. As a backend engineer, I want rollback verification to remove only objects created by the migration, so that unrelated database objects are preserved.
11. As a backend engineer, I want schema-parity checks to cover all 20 domain tables, so that no Prisma model is silently omitted.
12. As a backend engineer, I want every column name and mapped legacy name checked, so that the existing PostgreSQL contract is preserved.
13. As a backend engineer, I want column types, lengths, precision, scale, and timestamp precision checked, so that TypeORM does not introduce storage drift.
14. As a backend engineer, I want column nullability and defaults checked, so that inserts and updates keep their current behavior.
15. As a backend engineer, I want primary keys, composite keys, unique indexes, and foreign keys checked, so that database integrity remains equivalent.
16. As a backend engineer, I want every foreign-key delete and update action checked, so that deletion behavior remains compatible with order history and catalog relationships.
17. As a backend engineer, I want representative identity and authorization rows inserted, so that User, Role, Permission, UserRole, and RolePermission mappings work together.
18. As a backend engineer, I want representative catalog rows inserted, so that Artist, Category, Product, ProductArtist, ProductVariant, and VariantAttribute mappings work together.
19. As a backend engineer, I want representative cart and order rows inserted, so that transactional relations and composite uniqueness work in PostgreSQL.
20. As a backend engineer, I want self-referential category behavior tested, so that parent deletion continues to set child references to null.
21. As a backend engineer, I want the legacy `is_pulished` column verified, so that the migration does not silently rename a deployed schema contract.
22. As an operator, I want an adoption rehearsal to begin from a Prisma-created schema, so that it represents an existing installation rather than an empty database.
23. As an operator, I want adoption preflight to compare the complete live schema with the authoritative inventory, so that drift blocks the baseline operation.
24. As an operator, I want adoption preflight to be read-only, so that an incompatible database remains unchanged.
25. As an operator, I want an exact TypeORM fake-baseline operation, so that the initial create-all migration is recorded without executing it on existing tables.
26. As an operator, I want representative row counts and values preserved across baseline adoption, so that the process proves it is non-destructive.
27. As an operator, I want migration history verified after the fake baseline, so that later TypeORM migrations can run normally.
28. As a backend engineer, I want update timestamps populated on inserts, so that non-null timestamp columns do not reject TypeORM repository writes.
29. As a backend engineer, I want update timestamps refreshed on updates, so that TypeORM preserves Prisma's `@updatedAt` behavior.
30. As a backend engineer, I want nullable update timestamps to retain their existing nullability while receiving automatic updates, so that User and Role compatibility is preserved.
31. As a developer, I want TypeORM CLI commands to load the documented environment configuration, so that local migration commands work without manual shell exports.
32. As a CI maintainer, I want missing configuration and migration errors to return a non-zero exit status, so that failed jobs cannot appear successful.
33. As a developer, I want a clean checkout to generate the Prisma client while Prisma-backed modules remain, so that build and tests are reproducible during the transition.
34. As a maintainer, I want documentation to say that feature services remain Prisma-backed, so that the migration status is not overstated.
35. As a maintainer, I want Prisma deployment and seed commands retained until their TypeORM replacements exist, so that current environments remain operable.
36. As a maintainer, I want Prisma dependencies removed only after all runtime references are migrated, so that the application never enters a knowingly broken state.
37. As a reviewer, I want skipped PostgreSQL suites reported as unverified rather than passed, so that completion claims reflect executed evidence.
38. As a reviewer, I want the foundation definition of done tied to build, unit, legacy e2e, and real PostgreSQL results, so that the next migration phase begins from a stable base.

## Implementation Decisions

- Preserve the current phase boundary: feature services, controllers, guards, DTOs, and business rules remain Prisma-backed until separate vertical-slice migrations are approved.
- Treat the repository as a transitional dual-ORM application until all runtime Prisma dependencies are removed.
- Keep the Prisma schema and checked-in Prisma initial migration as the authoritative schema sources for this repair.
- Use one high-level disposable PostgreSQL seam for migration, schema parity, adoption, migration-history, and rollback behavior.
- Provision a unique database or explicitly created schema for every database-test run. Configure the schema through TypeORM options rather than relying on an arbitrary connection-string query parameter.
- Reject database-test configuration that targets the normal application database or a non-isolated default schema.
- Give TypeORM migration history a known table name and exclude that exact table from domain schema comparisons.
- Keep automatic schema synchronization disabled.
- Compare the live PostgreSQL catalog with the complete schema inventory, including tables, columns, types, precision, nullability, defaults, keys, indexes, foreign keys, and referential actions.
- Preserve all 20 existing tables and the legacy `posts.is_pulished` mapping.
- Build the adoption rehearsal from the authoritative Prisma migration, insert representative existing data, run read-only parity preflight, then use TypeORM's fake migration facility to record the initial migration.
- Abort adoption before recording migration history when any schema drift is detected.
- Verify that adoption changes migration history only and preserves existing domain rows and schema objects.
- Model Prisma `@updatedAt` fields with TypeORM-managed update timestamps while preserving each column's database name, precision, and nullability.
- Preserve decimal values as strings at the TypeORM entity boundary unless a later feature-service specification explicitly introduces conversion.
- Load environment configuration in the CLI DataSource using the same repository convention already used by Prisma configuration.
- Ensure CLI failures set a non-zero process status; do not add wrapper scripts that hide command failures.
- Generate the Prisma client as part of the clean-checkout build preparation while Prisma runtime code remains present.
- Keep deployment and seed behavior Prisma-backed during this repair. Replacing those workflows belongs to the later runtime migration phase.
- Update migration handoff documentation to distinguish verified behavior, skipped behavior, and remaining Prisma boundaries.

## Testing Decisions

- The primary test seam is one disposable PostgreSQL lifecycle: provision isolation, create the starting schema, execute the requested migration or adoption operation, inspect external database behavior, then destroy the isolated target.
- Good tests assert observable PostgreSQL state and command outcomes. Source-text substring tests may remain as lightweight guards but cannot prove migration or adoption behavior.
- The clean-database path will verify initial migration execution, all schema objects, migration-history idempotency, representative inserts, referential actions, and rollback.
- The existing-database path will apply the authoritative Prisma migration, insert representative rows, run full read-only preflight, fake-apply the initial TypeORM migration, and verify data plus migration history.
- Entity metadata tests will verify mappings that affect future repository behavior, including automatic update timestamps and decimal representation.
- DataSource tests will verify explicit schema selection, disabled synchronization, registered entities and migrations, environment loading, and missing-configuration failure.
- CLI tests will verify successful command execution and non-zero failure status without targeting a shared database.
- Existing metadata suites provide prior art for entity table, column, uniqueness, and relation assertions.
- Existing Prisma-mocked e2e suites provide prior art for preserving current API behavior while TypeORM is disabled for legacy application tests.
- Existing migration and schema-inventory fixtures provide the expected PostgreSQL contract, but database-backed tests must compare the full inventory instead of checking representative subsets only.
- A database-backed suite skipped because PostgreSQL is unavailable is reported as unverified and cannot satisfy the definition of done.
- Final verification includes a clean checkout or generated-client cleanup scenario, application build, unit tests, legacy e2e tests, and the full PostgreSQL database suite.

## Out of Scope

- Rewriting Product, Artist, Category, Cart, Order, User, Staff, Role, Permission, Promotion, or Authentication services to TypeORM repositories.
- Removing Prisma runtime packages, generated types, mocks, schema files, migration history, or module wiring.
- Replacing the Prisma seed implementation with TypeORM.
- Switching production deployment from Prisma migrations to TypeORM migrations.
- Changing REST API contracts, DTO validation, authorization rules, or business behavior.
- Renaming `posts.is_pulished` or making unrelated schema corrections.
- Adding new domain tables, columns, indexes, or product features.
- Resetting or modifying any shared, staging, or production database during verification.

## Further Notes

- Metadata-only TypeORM verification currently passes while three PostgreSQL-backed suites are skipped when no test database is configured.
- Against a clean disposable PostgreSQL 16 database, the current database suite produces three failed suites: migration table counting, schema-parity table counting, and adoption against a missing `users` table.
- The current test URL's `schema` query parameter does not populate TypeORM's PostgreSQL schema option, so it does not provide the documented isolation.
- After generating the still-required Prisma client, the application build, 253 unit tests, and 44 legacy e2e tests pass.
- The generic TypeScript no-emit check still reports pre-existing test typing errors; the Nest application build passes because its build configuration excludes those test failures.
- Completion requires real PostgreSQL evidence. Passing metadata tests plus skipped integration suites is insufficient.
