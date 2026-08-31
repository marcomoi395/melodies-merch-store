# TypeORM Database Test Environment

Database-backed tests must never use the shared application database.

## Local runs

1. Start a disposable PostgreSQL instance (for example, the repository's local PostgreSQL container).
2. Set `TEST_DATABASE_URL` to that disposable database, such as `postgresql://user:password@localhost:5432/melodies_test`.
3. Optionally set `DATABASE_SCHEMA` to a unique schema name. If omitted, the test setup uses `test_<process id>`.
4. Run `npm run test:database`.
5. Drop the disposable database or schema after the run.

The database Jest setup derives `DATABASE_URL` from `TEST_DATABASE_URL`, adds the isolated schema query parameter, and enables TypeORM. Migration tests run against that URL and undo their migration during teardown.

## CI runs

CI must provision a dedicated PostgreSQL database per job (or per test worker), expose its connection string as `TEST_DATABASE_URL`, and use a unique `DATABASE_SCHEMA`. The CI job owns teardown and must drop the database/schema even when tests fail.

The migration e2e tests are skipped when `TEST_DATABASE_URL` is absent, so unit and metadata tests remain runnable without PostgreSQL. They must not be changed to target `DATABASE_URL` from a developer's application environment.

## Legacy mocked e2e tests

Run legacy Prisma-mocked e2e tests with `npm run test:e2e`. This command sets `TYPEORM_ENABLED=false`, preventing TypeORM initialization while the Prisma and Redis providers are mocked.
