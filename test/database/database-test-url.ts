import { randomUUID } from 'node:crypto';

const isolatedSchemaPattern = /^test_[a-zA-Z0-9_]+$/;
const dedicatedDatabasePattern = /(^test_|_test$)/;

export interface IsolatedDatabaseTarget {
    url: string;
    schema: string;
}

export function getIsolatedDatabaseTarget(
    environment: NodeJS.ProcessEnv = process.env,
): IsolatedDatabaseTarget {
    const testDatabaseUrl = environment.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
        throw new Error('TEST_DATABASE_URL is required for database tests');
    }

    const url = new URL(testDatabaseUrl);
    const databaseName = url.pathname.slice(1);
    const allowedDatabases = environment.TEST_DATABASE_NAME_ALLOWLIST?.split(',').map((name) =>
        name.trim(),
    );
    if (
        !dedicatedDatabasePattern.test(databaseName) &&
        !allowedDatabases?.includes(databaseName)
    ) {
        throw new Error(
            'TEST_DATABASE_URL must target a dedicated test database (test_* or *_test), or be listed in TEST_DATABASE_NAME_ALLOWLIST',
        );
    }
    const schema =
        environment.DATABASE_SCHEMA ?? `test_${process.pid}_${randomUUID().replaceAll('-', '')}`;

    if (!isolatedSchemaPattern.test(schema)) {
        throw new Error(
            'DATABASE_SCHEMA must start with "test_" and use only letters, numbers, or underscores',
        );
    }

    // TypeORM uses its schema option; a URL query parameter is not schema isolation.
    url.searchParams.delete('schema');
    return { url: url.toString(), schema };
}

export function getIsolatedDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
    return getIsolatedDatabaseTarget(environment).url;
}
