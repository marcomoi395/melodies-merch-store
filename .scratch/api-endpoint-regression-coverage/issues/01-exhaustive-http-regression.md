Type: task
Status: resolved

## Goal

Cover every published REST endpoint through the disposable PostgreSQL API seam and preserve authorization and response contracts.

## Acceptance Criteria

- Public catalog, authentication, account, cart, shopper order, administrative catalog, promotion, permission, role, staff, and administrative order routes have HTTP regression coverage.
- Tests migrate and seed a unique schema, use real guards and TypeORM services, then drop the schema.
- Controller-level permission metadata is enforced alongside handler-level metadata.
- Legacy schemas without database UUID defaults can seed and persist new records.
- Unit, API E2E, database, typecheck, build, lint, and formatting checks pass.

## Answer

Implemented in the endpoint compatibility suite. Added isolated shopper/Super Admin workflows, validation/error coverage for email side-effect routes, UUID generation at the TypeORM subscriber boundary, class-level permission resolution, slug-conflict fixes, and response status alignment.
