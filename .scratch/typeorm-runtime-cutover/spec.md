# Complete the TypeORM Runtime Cutover

Status: resolved

## Problem Statement

Melodies Merch Store has a verified TypeORM schema and migration foundation, but its API still executes every business query through Prisma. The application starts both database clients, build preparation generates a Prisma client, tests mock Prisma, the seed and operational documentation use Prisma commands, and some API types import Prisma-generated types. This leaves two persistence systems to maintain and makes the intended TypeORM migration incomplete.

## Solution

Move every persistence boundary to TypeORM in one complete cutover effort, while preserving the current PostgreSQL schema, REST behavior, authorization behavior, seed data, and safe adoption history. The resulting repository has one TypeORM DataSource, TypeORM repositories/entities for all persistence, TypeORM migrations for new databases and forward changes, and no active Prisma package, client generation, runtime module, generated type dependency, command, test mock, schema source, migration workflow, or documentation path. This is the final ORM migration phase; no Prisma cleanup or feature conversion may be deferred to a later effort.

## User Stories

1. As a shopper, I want catalog browsing to return the same products, artists, categories, variants, prices, and media, so that the migration does not change my shopping experience.
2. As a shopper, I want cart creation and updates to retain quantity, variant, and stock behavior, so that my checkout state remains correct.
3. As a shopper, I want order creation to retain totals, discounts, inventory effects, and transaction records, so that purchases stay accurate.
4. As a shopper, I want authentication and profile actions to retain their current behavior, so that I can still access my account.
5. As a staff member, I want user, role, permission, promotion, and order administration to keep current authorization rules, so that back-office work is uninterrupted.
6. As a content editor, I want posts and audit records to preserve their legacy database mappings, so that existing content and history remain accessible.
7. As an operator, I want an existing Prisma-created database to continue working after deployment, so that migration does not rewrite or lose rows.
8. As an operator, I want new databases created only by TypeORM migrations, so that provisioning has one owner.
9. As an operator, I want TypeORM migration history to remain the sole forward-migration history after adoption, so that deployment is deterministic.
10. As an operator, I want the initial baseline process to remain non-destructive, so that existing production tables are never recreated.
11. As a developer, I want the application to open only one ORM connection, so that startup and failure modes are simple.
12. As a developer, I want feature services to use injected TypeORM repositories, so that persistence code has one supported abstraction.
13. As a developer, I want transactions to use TypeORM transaction boundaries, so that related cart, order, promotion, and stock writes remain atomic.
14. As a developer, I want relations loaded explicitly where API responses need them, so that TypeORM lazy-loading behavior cannot change response timing or shape.
15. As a developer, I want decimal, JSONB, UUID, enum-like, timestamp, soft-delete, and legacy-column handling preserved, so that database values retain their current semantics.
16. As a developer, I want seed data created through TypeORM, so that a fresh environment needs no Prisma command or client.
17. As a developer, I want TypeScript domain/API types independent of generated Prisma types, so that deleting Prisma does not break compilation.
18. As a developer, I want service tests to use repository or transaction-manager doubles at the persistence boundary, so that tests no longer depend on Prisma APIs.
19. As a CI maintainer, I want build, unit, API e2e, migration, adoption, and seed verification to run without Prisma installation or generation, so that CI proves the cutover is complete.
20. As a maintainer, I want package metadata, scripts, environment guidance, and operational documents to name only TypeORM, so that developers do not run stale Prisma workflows.
21. As a maintainer, I want Prisma schema, migration, generated-client, configuration, and seed artifacts removed from the working tree, so that TypeORM is the only schema and persistence authority.
22. As a reviewer, I want a single observable API-and-database compatibility seam, so that migration confidence comes from behavior rather than ORM implementation details.
23. As a reviewer, I want a guard against Prisma imports, packages, commands, and generated artifacts, so that the project cannot silently regress to dual-ORM operation.
24. As an operator, I want every deployed database baseline status recorded before cutover, so that the TypeORM-only release cannot encounter an unadopted schema.
25. As an operator, I want an application rollback procedure that does not reverse or recreate the database schema, so that a failed release can be recovered without data loss.
26. As a maintainer, I want the cutover definition of done to require zero deferred Prisma work, so that this migration is not followed by another ORM-removal phase.

## Implementation Decisions

- TypeORM becomes the only runtime ORM. Register one shared DataSource and entity/repository integration; remove Prisma module/service wiring and duplicate direct provider registrations.
- Preserve the current 20-table PostgreSQL contract exactly, including UUIDs, composite keys, nullability, defaults, indexes, relation actions, timestamp behavior, decimal representation, JSONB fields, soft deletion, and the legacy `posts.is_pulished` column.
- Keep automatic synchronization disabled. TypeORM migrations remain the only schema-change mechanism for new databases and future changes.
- Replace the current Prisma-dependent adoption preflight with TypeORM-owned PostgreSQL catalog verification against the checked-in TypeORM migration/entity inventory. The final adoption command must execute without Prisma packages, schema files, generated clients, or CLI commands.
- Require an environment-by-environment cutover ledger covering local shared environments, CI, staging, and production. Each existing database must pass schema preflight, hold the fake initial TypeORM migration record, and have a verified backup before the TypeORM-only application is deployed.
- Rewrite feature persistence in dependency order: identity and authorization; catalog; cart and order; promotions and transactions; content and audit. Convert every service and guard that currently calls Prisma to injected repositories or an injected DataSource/EntityManager only where a multi-repository transaction is required.
- Inventory every current Prisma query and map it to a TypeORM replacement before deleting the old implementation. The inventory must cover filters, ordering, pagination, relation selection, uniqueness assumptions, not-found behavior, bulk writes, counts, soft-delete rules, and transaction membership; no query may be marked as follow-up work.
- Register entity repositories at feature-module boundaries. Do not add generic repository wrappers; TypeORM repositories are the persistence seam.
- Preserve all existing controller, DTO, validation, response serialization, authorization, and error contracts. Replace Prisma-specific error handling with equivalent TypeORM/database error translation at the same service boundary.
- Use TypeORM transaction callbacks for every existing multi-write Prisma transaction. Ensure transaction-scoped repositories are used inside those callbacks, and preserve required locking, isolation, uniqueness-conflict, and concurrent stock/discount behavior.
- Replace generated Prisma model imports in controllers, services, helpers, and local entity types with stable TypeScript types derived from TypeORM entities or explicit API/domain types, without exposing TypeORM persistence internals through HTTP contracts.
- Replace the Prisma seed with a TypeORM DataSource-based seed command that is idempotent and preserves the current Super Admin, permissions, categories, and other documented base data.
- Remove Prisma client generation from build preparation; delete Prisma dependencies and lockfile entries, configuration, schema directory, migrations, seed, runtime module/service, mocks, scripts, generated client output, TypeScript includes/path mappings, feature flags, and Prisma-only test setup after their replacements pass.
- Do not retain Prisma artifacts in the working tree as an archive. Git history and resolved tracker records provide historical evidence; active architecture and operational documentation must describe TypeORM as the sole ORM and schema authority.
- Update local development, CI, deployment, ERD ownership, contributor instructions, test guidance, and adoption instructions to use only TypeORM commands. Existing databases must be fake-baselined before any forward TypeORM migration is applied.
- Implement in reviewable commits on the cutover branch, but merge and deploy only the complete TypeORM-only state. Do not release dual reads, dual writes, runtime ORM toggles, or a partially converted feature set.
- Provide a cutover runbook with pre-deploy backup and baseline checks, migration/seed/startup order, smoke tests, post-deploy evidence, and abort conditions. Because this effort does not intentionally change the domain schema, application rollback uses the previous deployable artifact and does not revert the TypeORM baseline or drop schema objects.
- Completion is binary: all feature queries, transactions, seeds, tests, builds, migrations, adoption tooling, CI, deployment commands, and active documentation use TypeORM; Prisma has no executable or generated presence; all required verification passes. Otherwise the issue remains open and must not be described as migrated.

## Testing Decisions

- Primary seam: one disposable PostgreSQL-backed API compatibility suite bootstraps the production module with TypeORM only, seeds or migrates the target, exercises representative HTTP flows across identity, authorization, catalog, cart, checkout/order, promotions, and content, then inspects only observable responses and committed database state.
- Good tests assert API behavior, persisted rows, transaction atomicity, constraints, and command exit outcomes. They do not assert repository method calls, decorators, or query-builder implementation details.
- Reuse the existing isolated PostgreSQL lifecycle, migration/adoption suites, schema inventory, and API e2e setup as prior art. The suite must never target a shared application database.
- Keep focused service tests where business branches are difficult to reach through HTTP. Replace Prisma mocks with minimal repository/transaction doubles and assert public service outcomes plus translated errors.
- Add focused repository integration coverage for query shapes whose relation loading, filtering, pagination, locking, soft-delete handling, or decimal conversion can alter existing behavior.
- Verify each former Prisma transaction under successful and failed write paths; failed paths must leave no partial cart, order, discount-usage, inventory, or authorization data.
- Verify a fresh empty database can migrate, seed, start, and serve representative requests with no Prisma package installed.
- Verify a frozen legacy-schema SQL fixture owned by the TypeORM test suite can pass the TypeORM-only adoption path, start the application, preserve representative data, and accept a subsequent TypeORM migration. The fixture must not invoke or require Prisma tooling.
- Add a clean-install/build guard that fails if application source, tests, package metadata or lockfile, scripts, generated output, active configuration, CI/deployment files, or active documentation retain Prisma imports, packages, commands, paths, or runtime flags. Resolved tracker history and Git history are the only exclusions.
- Verify the application starts with one database connection path and no ORM-selection environment flag.
- Verify the cutover runbook against a disposable production-like clone, including abort before deployment on schema drift and application rollback without database rollback.
- Required final evidence: clean dependency install; production build; unit suite; TypeORM-only API e2e; disposable PostgreSQL migration/adoption/rollback suite; fresh-database seed verification; production-like cutover rehearsal; zero-active-Prisma guard; and recorded baseline readiness for every deploy target.

## Out of Scope

- Changing REST routes, request/response schemas, user-facing business rules, permissions, catalog data model, payment-provider behavior, or Redis/mail infrastructure.
- Adding new database tables, columns, indexes, or unrelated schema corrections.
- Renaming the deployed legacy `posts.is_pulished` column.
- Resetting, dropping, or modifying shared, staging, or production databases during verification.
- Reworking the completed TypeORM schema foundation except where a proven runtime parity defect requires a narrowly scoped correction.
- Leaving any Prisma-backed feature, command, test, seed, generated type, deployment path, or active documentation cleanup for a later phase.

## Further Notes

- The repository currently has TypeORM entities, migrations, adoption rehearsal, and database tests, but no feature-level repository injection. Prisma remains active in the application module, feature services, guards, seed, build preparation, e2e mocks, and generated-type imports.
- `TYPEORM_ENABLED=false` exists solely for legacy Prisma-mocked e2e isolation and must disappear with the last Prisma test path.
- The highest existing verification seam is the disposable PostgreSQL lifecycle plus API e2e setup. It should be extended rather than introducing a second persistence test harness.
- References to Prisma may remain only in Git history and resolved issue-tracker records that describe the completed transition. They are not part of the application, toolchain, or operational workflow.
