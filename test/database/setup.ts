import { getIsolatedDatabaseTarget } from './database-test-url';

if (process.env.TEST_DATABASE_URL) {
    const target = getIsolatedDatabaseTarget(process.env);
    process.env.DATABASE_SCHEMA = target.schema;
    process.env.DATABASE_URL = target.url;
}
