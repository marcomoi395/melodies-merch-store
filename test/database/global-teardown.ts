import { Client } from 'pg';
import { getIsolatedDatabaseTarget } from './database-test-url';

export default async function globalTeardown(): Promise<void> {
    if (!process.env.TEST_DATABASE_URL || !process.env.DATABASE_SCHEMA) {
        return;
    }

    const target = getIsolatedDatabaseTarget(process.env);
    const client = new Client({ connectionString: target.url });
    await client.connect();
    try {
        await client.query(`DROP SCHEMA IF EXISTS "${target.schema}" CASCADE`);
    } finally {
        await client.end();
    }
}
