# Implementation Plan: Prisma-to-TypeORM Persistence Migration Foundation

> Status: superseded. The canonical tracker is `.scratch/typeorm-foundation-repair/`; its spec and all four issues are resolved. This plan remains historical context only.

## Overview

Implement the first foundation phase of the eventual full Prisma replacement from `SPEC.md`: TypeORM 0.3.x configuration, entities for all 20 Prisma models, a complete PostgreSQL initial migration, safe existing-database adoption, and database-backed verification. Existing feature services/controllers remain Prisma-backed until a later rewrite phase.

## Gates and Constraints

- `prisma/schema.prisma` and `prisma/migrations/20260106151610_init_db/migration.sql` are authoritative.
- Preserve all tables, columns, types, nullability, defaults, keys, indexes, mappings, relations, and delete actions.
- Preserve legacy `posts.is_pulished`; do not use `synchronize: true`.
- Do not reset or drop existing non-disposable databases.
- User approval of `SPEC.md` and this plan is required before Task 1.
- Before Task 2, decide migration-history handling, CI/local PostgreSQL provisioning and cleanup, and entity class naming.

## Dependency Graph

```text
Task 0 approval/decisions
  → Task 1 schema inventory
  → Task 2 TypeORM DataSource/CLI
  → Task 2b database test discovery/lifecycle
  → entity slices (3, 4a, 4b, 5a, 5b, 6)
  → Task 7 initial migration
  → Task 8 existing DB adoption
  → Task 9 Nest integration
  → Task 10 migration e2e
  → Task 11 final verification
```

## Tasks

### Task 0: Approve specification and resolve decisions

**Description:** Obtain explicit approval and record the migration-history, PostgreSQL test-environment, and `<Model>Entity` naming decisions.

**Acceptance criteria:**
- [x] User explicitly approves `SPEC.md` and this plan.
- [x] Migration history strategy is recorded.
- [x] PostgreSQL provisioning, database name, isolation, and cleanup are recorded.
- [x] Entity naming convention is recorded.

**Recorded decisions (2026-08-31):**
- The existing Prisma migration history is retained for historical records; TypeORM uses its own migration table for forward execution after an explicit baseline/adoption step.
- Database-backed tests use a dedicated PostgreSQL database provisioned by the local/CI environment, with a unique per-run schema or database name and teardown after each run. Tests must never target a shared application database.
- Entity classes use the `<Model>Entity` convention, with singular PascalCase names such as `UserEntity`.

**Verification:** Review the recorded decisions before implementation.

**Dependencies:** None

**Estimated complexity:** Small

### Task 1: Establish schema parity inventory

**Description:** Create a machine-checkable baseline for all 20 tables and schema objects.

**Acceptance criteria:**
- [x] Inventory lists all 20 tables/models.
- [x] Inventory captures mapped columns, types, nullability, defaults, keys, indexes, and foreign-key delete actions.
- [x] `posts.is_pulished` is explicitly represented.
- [x] Prisma schema/SQL discrepancies are documented, including timestamp precision and default differences.

**Verification:** Focused schema inventory Jest test passes. Full suite/build are blocked by the repository's pre-existing missing generated Prisma client and related Prisma type errors.

**Dependencies:** Task 0

**Files:** `test/database/schema-fixtures.ts`, `test/database/schema-inventory.spec.ts`

**Estimated complexity:** Small

### Task 2: Add TypeORM packages, shared DataSource, and CLI commands

**Description:** Add TypeORM 0.3.x/Nest integration and one shared configuration source for runtime and CLI.

**Acceptance criteria:**
- [ ] `typeorm` and `@nestjs/typeorm` are compatible with Nest 11.
- [ ] `src/database/data-source.ts` reads `DATABASE_URL`, registers entities/migrations, and sets `synchronize: false`.
- [ ] Nest and CLI derive options from one shared source.
- [ ] These exact commands are supported: `npm run typeorm migration:run -- -d src/database/data-source.ts` and `npm run typeorm migration:revert -- -d src/database/data-source.ts`.
- [ ] Missing `DATABASE_URL` fails consistently with application configuration.

**Verification:** Focused DataSource test, command checks, and `npm run build`.

**Dependencies:** Task 0, Task 1

**Files:** `package.json`, lockfile, `src/database/data-source.ts`, focused DataSource test

**Estimated complexity:** Medium

### Task 2b: Configure database test discovery and lifecycle

**Description:** Make database tests executable and isolate real migration tests from existing Prisma-mocked e2e tests.

**Acceptance criteria:**
- [ ] An explicit Jest configuration/command discovers `test/database/*.spec.ts`.
- [ ] PostgreSQL variables, provisioning, isolation, and cleanup are documented for local and CI runs.
- [ ] Legacy Prisma-mocked e2e setup opts out of TypeORM initialization.
- [ ] Migration e2e setup opts into a real isolated TypeORM DataSource.

**Verification:** Run the focused database Jest command and one existing Prisma-mocked e2e test.

**Dependencies:** Task 0, Task 2

**Files:** `package.json`, database Jest config, `test/helpers/app-setup.ts`, database test helper, test-environment runbook

**Estimated complexity:** Medium

### Checkpoint: Foundation

- [ ] Task 0 approval/decisions complete.
- [ ] Tasks 1, 2, and 2b verification passes.
- [ ] No feature service/controller files changed.

### Task 3: Implement identity and authorization entities

**Description:** Implement User, Role, Permission, UserRole, and RolePermission entities.

**Acceptance criteria:** Exact mappings, nullable/default metadata, composite keys, unique constraints, relations, and cascades match the baseline.

**Verification:** Focused identity metadata tests.

**Dependencies:** Task 2, Task 2b

**Estimated complexity:** Medium

### Task 4a: Implement artist and category entities

**Description:** Implement Artist and Category entities, including the self-referential category relation.

**Acceptance criteria:** Exact mappings, slug uniqueness, and category `SET NULL` behavior match the baseline.

**Verification:** Focused artist/category metadata tests.

**Dependencies:** Task 2, Task 2b

**Estimated complexity:** Small

### Task 4b: Implement product entities

**Description:** Implement Product, ProductArtist, ProductVariant, and VariantAttribute entities.

**Acceptance criteria:** Exact mappings, composite keys, SKU/slug uniqueness, decimals, JSONB, and foreign keys match the baseline.

**Verification:** Focused product metadata tests.

**Dependencies:** Tasks 2, 2b, and 4a

**Estimated complexity:** Medium

### Task 5a: Implement cart and order entities

**Description:** Implement Cart, CartItem, Order, and OrderItem entities.

**Acceptance criteria:** Exact mappings, monetary metadata, cart-item uniqueness, and history-preserving relation actions match the baseline.

**Verification:** Focused cart/order metadata tests.

**Dependencies:** Tasks 2, 2b, 3, and 4b

**Estimated complexity:** Medium

### Task 5b: Implement promotion and transaction entities

**Description:** Implement Discount, DiscountUsage, and Transaction entities.

**Acceptance criteria:** Exact mappings, defaults, monetary/JSONB metadata, and `SET NULL`/`CASCADE` actions match the baseline.

**Verification:** Focused promotion/transaction metadata tests.

**Dependencies:** Tasks 2, 2b, 3, and 5a

**Estimated complexity:** Small

### Task 6: Implement content and audit entities

**Description:** Implement Post and AuditLog entities with exact legacy mappings.

**Acceptance criteria:** `isPublished` maps to `is_pulished`; JSONB/text/varchar/timestamp fields and `SET NULL` author/actor relations match the baseline.

**Verification:** Focused content/audit metadata tests.

**Dependencies:** Tasks 2, 2b, and 3

**Estimated complexity:** Small

### Checkpoint: Entity Metadata

- [ ] All 20 entities are registered.
- [ ] All focused metadata tests pass.
- [ ] Decimal representation and legacy names are reviewed.

### Task 7: Create the complete TypeORM initial migration

**Description:** Create one deterministic migration that creates and reverts the complete schema.

**Acceptance criteria:** `up()` and `down()` cover all 20 tables, columns, defaults, keys, indexes, and foreign keys in dependency-safe order.

**Verification:** Structure test plus disposable PostgreSQL run/revert using the exact CLI commands.

**Dependencies:** Tasks 1, 2, 2b, 3, 4a, 4b, 5a, 5b, 6

**Estimated complexity:** Medium

### Task 8: Document and rehearse existing-database adoption

**Description:** Define a non-destructive baseline procedure for databases already created by Prisma.

**Acceptance criteria:** Procedure follows Task 0 history decision, performs preflight parity checks, aborts on drift, and preserves rows/schema objects.

**Verification:** Rehearse against an isolated Prisma-created database clone.

**Dependencies:** Tasks 0, 1, 2, 2b, 7

**Files:** `tasks/typeorm-adoption.md`, `test/database/adoption.e2e-spec.ts`, `test/database/adoption-schema.spec.ts`

**Estimated complexity:** Medium

### Task 9: Integrate TypeORM into Nest without feature rewrites

**Description:** Register one TypeORM Nest integration while preserving Prisma-backed feature modules.

**Acceptance criteria:** AppModule uses shared configuration; existing Prisma modules compile; legacy mocked e2e explicitly disables/overrides TypeORM; synchronization remains disabled.

**Verification:** Build, AppModule tests, startup check, and legacy mocked e2e.

**Dependencies:** Tasks 2, 2b, and 7

**Estimated complexity:** Medium

### Task 10: Add migration and schema-parity e2e tests

**Description:** Validate the real TypeORM migration against isolated PostgreSQL.

**Acceptance criteria:** Tests verify all 20 tables, schema objects, representative relations, rerun idempotency, rollback, and separation from legacy mocked e2e.

**Verification:** Focused migration e2e and `npm run test:e2e`.

**Dependencies:** Tasks 1, 2b, 3, 4a, 4b, 5a, 5b, 6, 7, 8, 9

**Files:** `test/database/migration.e2e-spec.ts`, `test/database/schema-parity.e2e-spec.ts`

**Estimated complexity:** Medium

### Task 11: Run final verification and record handoff

**Description:** Run all required commands and document the later Prisma service rewrite boundary.

**Acceptance criteria:** Build, standard tests, coverage, and e2e pass; no unrelated behavior changes; follow-up service/query rewrites are documented.

**Verification:**

```bash
npm run build
npm test
npm test -- --coverage
npm run test:e2e
```

**Dependencies:** Tasks 3, 4a, 4b, 5a, 5b, 6, 8, 9, 10

**Estimated complexity:** Small

## Final verification handoff

- TypeORM foundation coverage is complete through schema inventory, shared DataSource configuration, isolated database tests, all 20 entity metadata slices, initial migration, adoption runbook, Nest integration, and migration/schema-parity e2e coverage.
- `npm run build`, `npm test`, `npm test -- --coverage`, and `npm run test:e2e` were executed. They remain blocked by the pre-existing missing generated Prisma client under `generated/prisma/`, which causes Prisma imports and dependent feature tests to fail.
- Existing feature services/controllers intentionally remain Prisma-backed. A later phase must run Prisma generation successfully, then rewrite those services/controllers to TypeORM repositories before removing Prisma dependencies.
- PostgreSQL-backed migration, parity, and adoption rehearsal tests are gated on `TEST_DATABASE_URL` and must be run against a disposable isolated database/schema in CI or local rehearsal.

## Safe Parallelization

- Tasks 3 and 4a may run in parallel after Task 2b.
- Task 6 may run after Task 3 while catalog tasks proceed.
- Task 4b follows 4a; 5a follows 3 and 4b; 5b follows 3 and 5a.
- Task 7 is sequential and owns the migration file.
- Task 8 owns adoption files; Task 10 owns migration parity e2e files. No shared test-file ownership.
- Task 9 and Task 10 may run in parallel after Task 7 only with explicit TypeORM opt-out/opt-in behavior.

## Definition of Done

All task acceptance criteria pass, all 20 tables/entities are covered, PostgreSQL migration/adoption tests pass, legacy mocked e2e remains isolated, and build/unit/coverage/e2e verification passes.
