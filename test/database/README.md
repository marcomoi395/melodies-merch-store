# Database Test Lifecycle

Database-focused tests run with `npm run test:database`, which uses `test/jest-database.json` and discovers `test/database/*.spec.ts`.

## PostgreSQL provisioning

Set `DATABASE_URL` to a dedicated PostgreSQL database or schema created for the current local or CI run. Do not point database tests at the shared application database. CI should provision PostgreSQL before the test job and export the isolated connection URL.

Each migration integration suite must use a unique database/schema identifier, apply migrations in that isolated target, and remove the target during teardown. A failed run must be cleaned up manually before reusing the identifier.

## Legacy e2e isolation

The existing Prisma-mocked e2e suites run with `TYPEORM_ENABLED=false`, so they do not initialize a TypeORM connection. Real migration e2e suites must set `TYPEORM_ENABLED=true` and provide their isolated PostgreSQL `DATABASE_URL`.
