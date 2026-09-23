# Database Test Lifecycle

Database-focused tests run with `npm run test:database`, which uses `test/jest-database.json` and discovers `test/database/*.spec.ts`.

## PostgreSQL provisioning

Set `TEST_DATABASE_URL` to a dedicated PostgreSQL database. Its name must start with `test_`, end with `_test`, or be listed in `TEST_DATABASE_NAME_ALLOWLIST`; the suite rejects application databases. The suite creates and removes unique `test_*` schemas itself. CI should provision the dedicated database and export `TEST_DATABASE_URL` before the test job.

Adoption tests also require `TEST_SHADOW_DATABASE_URL`: a separate disposable PostgreSQL database. It is used only to reconstruct Prisma migrations during preflight; it must never be the target database.

Each migration integration suite must use a unique database/schema identifier, apply migrations in that isolated target, and remove the target during teardown. A failed run must be cleaned up manually before reusing the identifier.

## Legacy e2e isolation

The existing Prisma-mocked e2e suites run with `TYPEORM_ENABLED=false`, so they do not initialize a TypeORM connection. `npm run test:database` enables TypeORM and requires `TEST_DATABASE_URL`.
