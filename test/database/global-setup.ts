import { Client } from 'pg';
import { getIsolatedDatabaseTarget } from './database-test-url';

export default async function globalSetup(): Promise<void> {
    if (!process.env.TEST_DATABASE_URL) {
        return;
    }

    const target = getIsolatedDatabaseTarget(process.env);
    process.env.DATABASE_SCHEMA = target.schema;
    process.env.DATABASE_URL = target.url;

    const client = new Client({ connectionString: target.url });
    await client.connect();
    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${target.schema}"`);
    } finally {
        await client.end();
    }
}
