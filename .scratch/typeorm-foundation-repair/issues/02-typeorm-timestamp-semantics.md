# Preserve Prisma Update Timestamp Semantics

Type: task
Status: resolved

Blocked by: 01

Update TypeORM entities so fields currently maintained by Prisma `@updatedAt` receive equivalent insert and update behavior. Preserve database names, timestamp precision, and existing nullability.

## Acceptance Criteria

- Every Prisma `@updatedAt` field has TypeORM-managed update behavior.
- Metadata tests verify generated/update timestamp behavior, precision, and nullability.
- No feature service is rewritten.

## Comments

Derived from `../spec.md`.

## Answer

Implemented and merged. All Prisma `@updatedAt` fields use TypeORM update metadata, with a shared subscriber preserving automatic writes on the legacy schema.
