import { readFileSync } from 'node:fs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../src/database/database.module';
import { getIsolatedDatabaseTarget } from './database-test-url';

describe('DatabaseModule', () => {
    it('configures TypeORM from the shared DataSource options', () => {
        const imports = Reflect.getMetadata('imports', DatabaseModule) as Array<{
            module?: unknown;
            imports?: unknown[];
        }>;
        const typeOrmImport = imports.find((entry) => entry.module === TypeOrmModule);

        expect(typeOrmImport).toBeDefined();
        expect(typeOrmImport?.imports).toContainEqual(expect.anything());
    });
});

describe('Database test lifecycle configuration', () => {
    it('uses direct Jest commands for every suite', () => {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
            scripts: Record<string, string>;
        };

        expect(packageJson.scripts['test:database']).toBe(
            'jest --config ./test/jest-database.json',
        );
        expect(packageJson.scripts['test:e2e']).toBe('jest --config ./test/jest-e2e.json');
    });

    it('uses an isolated database URL for database tests', () => {
        const helperSource = readFileSync('test/database/database-test-url.ts', 'utf8');

        expect(helperSource).toContain('TEST_DATABASE_URL');
        expect(helperSource).toContain('DATABASE_SCHEMA');
    });
});

describe('Database test URL helper', () => {
    it('selects an isolated schema through an explicit TypeORM option', () => {
        expect(
            getIsolatedDatabaseTarget({
                TEST_DATABASE_URL: 'postgresql://localhost/melodies_test',
                DATABASE_SCHEMA: 'test_run_123',
            }),
        ).toEqual({
            url: 'postgresql://localhost/melodies_test',
            schema: 'test_run_123',
        });
    });

    it('rejects a shared-schema database test target', () => {
        expect(() =>
            getIsolatedDatabaseTarget({
                TEST_DATABASE_URL: 'postgresql://localhost/melodies_test',
                DATABASE_SCHEMA: 'public',
            }),
        ).toThrow('DATABASE_SCHEMA');
    });

    it('rejects a normal application database target', () => {
        expect(() =>
            getIsolatedDatabaseTarget({
                TEST_DATABASE_URL: 'postgresql://localhost/melodies',
                DATABASE_SCHEMA: 'test_run_123',
            }),
        ).toThrow('dedicated test database');
    });

    it('allows an explicitly allowlisted dedicated database', () => {
        expect(
            getIsolatedDatabaseTarget({
                TEST_DATABASE_URL: 'postgresql://localhost/ci_database',
                TEST_DATABASE_NAME_ALLOWLIST: 'ci_database',
                DATABASE_SCHEMA: 'test_run_123',
            }).url,
        ).toBe('postgresql://localhost/ci_database');
    });
});
