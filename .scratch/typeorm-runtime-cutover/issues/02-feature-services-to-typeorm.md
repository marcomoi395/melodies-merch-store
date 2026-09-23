Type: task
Status: open

Blocked by: 01-typeorm-adoption-and-single-datasource

## Goal

Rewrite every production feature service, guard, helper, and API type that currently depends on Prisma to use TypeORM repositories or transaction-scoped EntityManagers.

## Acceptance Criteria

- Identity/authentication, authorization, catalog, cart, order, promotion, staff, and content flows have no Prisma imports or calls.
- All current query behavior is preserved: filtering, ordering, pagination, relation loading, counts, uniqueness, not-found errors, soft deletes, decimals, and legacy columns.
- Every multi-write transaction uses TypeORM transaction boundaries and preserves rollback, locking, and stock/discount behavior.
- REST routes, DTOs, serialization, permissions, and error contracts remain unchanged.
- Focused service tests and TypeORM-backed API compatibility tests pass.

## Notes

Do not add generic repository abstractions. Register concrete repositories at feature-module boundaries; use EntityManager only for transaction-scoped work.
