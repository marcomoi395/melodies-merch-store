# TypeORM Adoption for Existing Prisma Databases

This procedure adopts TypeORM without dropping tables, rewriting rows, or blindly running the create-all initial migration against an existing Prisma-managed database.

## Migration history decision

Retain the existing Prisma migration history for historical records. TypeORM uses its own TypeORM migration history table. A baseline record must be inserted only after the schema preflight passes.

## Preflight

1. Set `DATABASE_URL` to the existing database. Never use a production URL for rehearsal.
2. Take a verified PostgreSQL backup and record the current Prisma migration status.
3. Compare the live schema to the authoritative Prisma initial migration and its complete schema inventory.
4. Confirm all 20 expected tables, columns, nullability, defaults, precision, unique indexes, primary keys, foreign keys, and delete actions match.
5. Confirm the legacy `posts.is_pulished` column exists exactly with that spelling.
6. Abort on any drift. Resolve drift in a separately approved migration; do not alter the TypeORM initial migration to hide it.

## Baseline

After a clean preflight, fake-record `Initial20260106151610` in TypeORM's own migration history table. Do not execute its `up()` method against the existing schema:

```bash
npm run typeorm migration:run -- -d src/database/data-source.ts --fake
```

Record the baseline timestamp, database identifier, schema comparison result, and operator in the deployment log.

## New databases

For an empty database, use:

```bash
npm run typeorm migration:run -- -d src/database/data-source.ts
```

The migration creates all 20 tables and schema objects. Re-running it is idempotent because TypeORM records the migration in its own history table.

## Rehearsal and cleanup

Rehearse against an isolated clone or disposable database built by applying `prisma/migrations/20260106151610_init_db/migration.sql`. Verify representative rows and schema objects before and after baseline. Remove only the disposable rehearsal database after evidence is captured; never reset or drop a shared or production database.
