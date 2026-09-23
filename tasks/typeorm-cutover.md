# TypeORM Cutover Runbook

Use this procedure for every local shared environment, CI database, staging database, and production database. This release changes the application persistence runtime; it does not intentionally change the PostgreSQL schema.

## Before deployment

1. Record the environment, database endpoint, backup location, operator, and timestamp in the deployment ledger.
2. Take and verify a restorable PostgreSQL backup. Do not continue without a successful restore check for production.
3. Run `npm run migration:adopt` against the target with its production connection settings. It must complete schema preflight and record the initial TypeORM migration in `typeorm_migrations` without changing application rows or schema objects.
4. Query the ledger table and record that the initial migration appears exactly once. For a fresh database, use `npm run migration:run` instead; do not run adoption.
5. Stop the deployment if the target schema differs from the TypeORM inventory, the baseline record is missing or duplicated, the backup is unavailable, or the target is not the intended environment.

## Deployment order

1. Build the release with `npm ci` and `npm run build`.
2. Apply pending migrations with the production command: `node node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js`.
3. Run `node dist/src/database/seed.js` once. The seed is idempotent; it synchronizes base IAM and catalog data without clearing the database.
4. Start the application with `node dist/src/main`.
5. Record migration output, seed output, image digest, and deployment timestamp in the ledger.

## Smoke tests

1. Confirm the application becomes healthy and opens one TypeORM connection path.
2. Verify a catalog read, authenticated admin login, permission-protected endpoint, cart update, and order read.
3. Confirm the expected TypeORM migration rows and base Super Admin, permissions, categories, and products exist.
4. Review application logs for connection failures, missing relation errors, migration errors, and constraint violations.

## Abort and rollback

Abort before startup if preflight, backup verification, baseline validation, migration, or seed fails. Do not retry against a different target or manually edit the migration ledger.

If the new application fails after deployment, roll back the application artifact only. Keep the TypeORM baseline and completed forward migrations in place; do not revert migrations, drop schema objects, or restore a database backup unless a separate data-recovery incident is declared. Confirm the previous artifact starts against the unchanged database, then record the failure and rollback evidence in the ledger.
