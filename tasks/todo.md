# TypeORM Migration Foundation Checklist

> Status: superseded. Use `.scratch/typeorm-foundation-repair/` for the resolved source of truth; this checklist is retained only as historical context.

This checklist covers the first phase of the eventual full Prisma replacement. Existing feature services/controllers remain Prisma-backed until a later rewrite phase.

## Pre-Implementation Decision Gate

- [x] Obtain explicit user approval for `SPEC.md` and this plan before Task 1.
- [x] Retain Prisma migration history and use a separate TypeORM migration history after explicit baseline/adoption.
- [x] Use a dedicated PostgreSQL database or schema per local/CI run, with teardown after each run; never use the shared application database.
- [x] Use `<Model>Entity` naming, such as `UserEntity`.

## Phase 1: Foundation and Contracts

- [x] **Task 1: Establish schema parity inventory**
  - Acceptance: Inventory all 20 tables; capture columns, types, defaults, keys, indexes, mapped names, `is_pulished`, foreign-key actions, property mappings, and documented Prisma/SQL discrepancies.
  - Verify: Focused schema inventory Jest test passes. Full suite/build are currently blocked by the repository's pre-existing missing generated Prisma client.
  - Dependencies: Approval gate
  - Complexity: Small

- [ ] **Task 2: Add TypeORM packages and DataSource configuration**
  - Acceptance: Add TypeORM/Nest integration; configure shared DataSource with `DATABASE_URL`, registered entities/migrations, `synchronize: false`, and exact run/revert scripts.
  - Verify: Focused DataSource test, CLI command checks, build.
  - Dependencies: Approval gate, Decision gate, Task 1
  - Complexity: Medium

- [ ] **Task 2b: Configure database test discovery and lifecycle**
  - Acceptance: Discover `test/database/*.spec.ts`; document PostgreSQL provisioning/isolation/cleanup; isolate legacy Prisma-mocked e2e from TypeORM and allow real migration e2e DataSource.
  - Verify: Focused database Jest command and existing Prisma-mocked e2e test.
  - Dependencies: Approval gate, Decision gate, Task 2
  - Complexity: Medium

### Checkpoint: Foundation Configuration

- [ ] Approval and migration decisions recorded.
- [ ] Schema inventory, DataSource, exact CLI commands, and database test lifecycle verified.
- [ ] No feature service/controller files changed.

## Phase 2: Entity Metadata Vertical Slices

- [ ] **Task 3: Implement identity and authorization entities**
  - Acceptance: User, Role, Permission, UserRole, RolePermission preserve mappings, keys, uniqueness, relations, and cascades.
  - Dependencies: Approval gate, Decision gate, Tasks 2 and 2b
  - Complexity: Medium

- [ ] **Task 4a: Implement artist and category entities**
  - Acceptance: Artist and Category preserve mappings, slug uniqueness, self-relation, and `SET NULL` behavior.
  - Dependencies: Approval gate, Decision gate, Tasks 2 and 2b
  - Complexity: Small

- [ ] **Task 4b: Implement product entities**
  - Acceptance: Product, ProductArtist, ProductVariant, VariantAttribute preserve mappings, keys, uniqueness, decimals, JSONB, and foreign keys.
  - Verify: Focused product metadata tests.
  - Dependencies: Approval gate, Decision gate, Tasks 2, 2b, and 4a
  - Complexity: Medium

- [ ] **Task 5a: Implement cart and order entities**
  - Acceptance: Cart, CartItem, Order, OrderItem preserve mappings, monetary metadata, composite uniqueness, and history delete actions.
  - Verify: Focused cart/order metadata tests.
  - Dependencies: Approval gate, Decision gate, Tasks 2, 3, and 4b
  - Complexity: Medium

- [ ] **Task 5b: Implement promotion and transaction entities**
  - Acceptance: Discount, DiscountUsage, Transaction preserve mappings, defaults, monetary/JSONB metadata, and foreign-key actions.
  - Verify: Focused promotion/transaction metadata tests.
  - Dependencies: Approval gate, Decision gate, Tasks 2, 3, and 5a
  - Complexity: Small

- [ ] **Task 6: Implement content and audit entities**
  - Acceptance: Post and AuditLog preserve all fields, `is_pulished`, and `SET NULL` author/actor relations.
  - Verify: Focused content/audit metadata tests.
  - Dependencies: Approval gate, Decision gate, Tasks 2 and 3
  - Complexity: Small

### Checkpoint: Entity Metadata Integration

- [ ] All 20 entities registered and focused metadata tests pass.
- [ ] Decimal representation and legacy-column decisions verified.

## Phase 3: Migration and Adoption

- [ ] **Task 7: Create the complete TypeORM initial migration**
  - Acceptance: Deterministic run/revert migration creates all 20 tables and every required schema object.
  - Verify: Structure test plus disposable PostgreSQL run/revert.
  - Dependencies: Approval gate, Decision gate, Tasks 1, 2, 2b, 3, 4a, 4b, 5a, 5b, 6
  - Complexity: Medium

- [ ] **Task 8: Document and rehearse existing-database adoption**
  - Acceptance: Non-destructive baseline procedure follows the history decision, checks drift, and preserves data/schema.
  - Verify: Isolated Prisma-database clone rehearsal.
  - Dependencies: Approval gate, Decision gate, Tasks 1, 2, 2b, 7
  - Complexity: Medium

## Phase 4: Nest Integration and Verification

- [ ] **Task 9: Integrate TypeORM into Nest without feature rewrites**
  - Acceptance: Shared configuration powers one Nest integration; existing Prisma services compile; mocked e2e explicitly isolates TypeORM; synchronization disabled.
  - Verify: Build, AppModule tests, startup check, legacy mocked e2e.
  - Dependencies: Approval gate, Decision gate, Tasks 2, 2b, 7
  - Complexity: Medium

- [ ] **Task 10: Add PostgreSQL migration and schema-parity e2e coverage**
  - Acceptance: Real isolated PostgreSQL tests cover all 20 tables, schema objects, relations, rerun idempotency, and rollback; no shared parity test ownership conflicts.
  - Verify: Focused migration e2e and `npm run test:e2e`.
  - Dependencies: Approval gate, Decision gate, Tasks 1, 2b, 3, 4a, 4b, 5a, 5b, 6, 7, 8, 9
  - Complexity: Medium

### Checkpoint: Migration Integration

- [ ] Clean migration, adoption rehearsal, Nest startup, and mocked/real e2e paths pass.

- [ ] **Task 11: Run final project verification and record handoff**
  - Acceptance: Build, standard tests, coverage, and e2e pass; later Prisma service rewrite is documented.
  - Verify: `npm run build`; `npm test`; `npm test -- --coverage`; `npm run test:e2e`.
  - Dependencies: Approval gate, Decision gate, Tasks 3, 4a, 4b, 5a, 5b, 6, 8, 9, 10
  - Complexity: Small

### Checkpoint: Complete

- [ ] All `SPEC.md` success criteria met.
- [ ] Plan and implementation reviewed for handoff.
