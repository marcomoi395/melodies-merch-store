import { getIsolatedDatabaseUrl } from './database-test-url';

const databaseSchema = process.env.DATABASE_SCHEMA ?? `test_${process.pid}`;
process.env.DATABASE_SCHEMA = databaseSchema;
process.env.DATABASE_URL = getIsolatedDatabaseUrl({
    ...process.env,
    DATABASE_SCHEMA: databaseSchema,
});
process.env.TYPEORM_ENABLED ??= 'true';
