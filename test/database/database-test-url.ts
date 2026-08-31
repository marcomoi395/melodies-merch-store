export function getIsolatedDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
    const baseUrl = new URL(
        environment.TEST_DATABASE_URL ?? 'postgresql://localhost/melodies_test',
    );
    const schema = environment.DATABASE_SCHEMA ?? `test_${process.pid}`;

    baseUrl.searchParams.set('schema', schema);
    return baseUrl.toString();
}
