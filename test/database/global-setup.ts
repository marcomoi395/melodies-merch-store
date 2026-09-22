import { getIsolatedDatabaseTarget } from './database-test-url';
import { createSchema } from './postgres-lifecycle';

export default async function globalSetup(): Promise<void> {
    if (!process.env.TEST_DATABASE_URL) {
        return;
    }

    const target = getIsolatedDatabaseTarget(process.env);
    process.env.DATABASE_SCHEMA = target.schema;
    process.env.DATABASE_URL = target.url;

    await createSchema(target.url, target.schema);
}
