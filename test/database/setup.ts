import { getIsolatedDatabaseTarget } from './database-test-url';

if (process.env.TEST_DATABASE_URL) {
    const target = getIsolatedDatabaseTarget(process.env);
    process.env.DATABASE_SCHEMA = target.schema;
    process.env.DATABASE_URL = target.url;
}

// Test-only key; never use this deterministic value in deployment.
process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'ab'.repeat(32);
