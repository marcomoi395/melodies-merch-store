import { getIsolatedDatabaseTarget } from './database-test-url';
import { dropSchema } from './postgres-lifecycle';

export default async function globalTeardown(): Promise<void> {
    if (!process.env.TEST_DATABASE_URL || !process.env.DATABASE_SCHEMA) {
        return;
    }

    const target = getIsolatedDatabaseTarget(process.env);
    await dropSchema(target.url, target.schema);
}
