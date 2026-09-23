# TypeORM Adoption for Existing Prisma Databases

This procedure adopts TypeORM without dropping tables, rewriting rows, or blindly running the create-all initial migration against an existing Prisma-managed database.

## Migration history decision

Retain the existing Prisma migration history for historical records. TypeORM uses its own TypeORM migration history table. A baseline record must be inserted only after the schema preflight passes.

## Preflight

1. Set `DATABASE_URL` to the existing database and `SHADOW_DATABASE_URL` to a separate disposable PostgreSQL database. For a non-public target schema, the command selects the same schema name in the shadow database. Never use a production URL for rehearsal or shadowing.
2. Take a verified PostgreSQL backup and record the current Prisma migration status.
3. Run `npm run migration:adopt`. It compares the target schema with the authoritative Prisma migrations, including all 20 expected tables, columns, defaults, indexes, foreign keys, and the legacy `posts.is_pulished` spelling.
4. Abort on any drift. The command does not write TypeORM migration history unless this preflight passes. Resolve drift in a separately approved migration; do not alter the TypeORM initial migration to hide it.

## Baseline

After its clean preflight, `migration:adopt` fake-records only `Initial20260106151610` in TypeORM's own migration history table. Do not execute its `up()` method against the existing schema:

```bash
npm run migration:adopt
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
