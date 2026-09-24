# Verify Migration and Schema Parity on PostgreSQL

Type: task
Status: resolved

Blocked by: 01, 02

Replace representative and misleading database assertions with one robust disposable PostgreSQL lifecycle. Cover clean migration, all domain schema objects, representative relational writes, idempotency, referential actions, and rollback.

## Acceptance Criteria

- Domain-table queries exclude the configured migration-history table exactly.
- Clean migration tests verify all 20 tables and complete schema inventory parity.
- Tests insert representative identity, catalog, cart/order, join-table, and self-referential records.
- Tests verify representative delete actions and migration rollback.
- PostgreSQL-backed tests pass with an isolated disposable target.

## Comments

Derived from `../spec.md`.

## Answer

Implemented and merged. The disposable PostgreSQL lifecycle verifies complete inventory parity, representative relational writes, referential actions, idempotency, and rollback.
