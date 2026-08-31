import { readFileSync } from 'node:fs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../src/database/database.module';
import { getIsolatedDatabaseUrl } from './database-test-url';

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
    it('enables TypeORM for the database Jest command', () => {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
            scripts: Record<string, string>;
        };

        expect(packageJson.scripts['test:database']).toContain('TYPEORM_ENABLED=true');
        expect(packageJson.scripts['test:e2e']).toContain('TYPEORM_ENABLED=false');
    });

    it('uses an isolated database URL for database tests', () => {
        const helperSource = readFileSync('test/database/database-test-url.ts', 'utf8');

        expect(helperSource).toContain('TEST_DATABASE_URL');
        expect(helperSource).toContain('DATABASE_SCHEMA');
    });
});

describe('Database test URL helper', () => {
    it('adds the isolated schema to TEST_DATABASE_URL', () => {
        expect(
            getIsolatedDatabaseUrl({
                TEST_DATABASE_URL: 'postgresql://localhost/melodies_test',
                DATABASE_SCHEMA: 'run_123',
            }),
        ).toBe('postgresql://localhost/melodies_test?schema=run_123');
    });
});
