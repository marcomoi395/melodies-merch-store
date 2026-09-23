import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/database/data-source';
import {
    createDataSourceOptions,
    TYPEORM_MIGRATIONS_TABLE,
} from '../../src/database/database-options';

describe('TypeORM DataSource configuration', () => {
    it('loads DATABASE_URL, disables synchronization, and registers migrations', () => {
        const options = createDataSourceOptions({
            DATABASE_URL: 'postgresql://localhost/melodies',
            DATABASE_SCHEMA: 'test_data_source',
        });

        expect(options.type).toBe('postgres');
        expect(options.url).toBe('postgresql://localhost/melodies');
        expect(options.schema).toBe('test_data_source');
        expect(options.migrationsTableName).toBe(TYPEORM_MIGRATIONS_TABLE);
        expect(options.synchronize).toBe(false);
        expect(options.migrations).toEqual(
            expect.arrayContaining([expect.stringContaining('migrations')]),
        );
        expect(options.subscribers).toEqual(
            expect.arrayContaining([expect.stringContaining('subscribers')]),
        );
    });

    it('uses the shared options for the exported CLI DataSource', () => {
        expect(AppDataSource.options).toEqual(expect.objectContaining(createDataSourceOptions()));
    });

    it('exposes the exact migration CLI commands', () => {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
            scripts: Record<string, string>;
        };

        expect(packageJson.scripts.typeorm).toBe('typeorm-ts-node-commonjs');
        expect(packageJson.scripts['migration:run']).toContain('migration:run');
        expect(packageJson.scripts['migration:revert']).toContain('migration:revert');
    });

    it('fails when DATABASE_URL is missing', () => {
        expect(() => createDataSourceOptions({})).toThrow('DATABASE_URL');
    });

    it('returns non-zero from the documented CLI command when configuration is missing', () => {
        const result = spawnSync(
            process.execPath,
            [
                require.resolve('typeorm/cli-ts-node-commonjs.js'),
                'migration:run',
                '-d',
                'src/database/data-source.ts',
            ],
            {
                cwd: process.cwd(),
                encoding: 'utf8',
                env: { ...process.env, DATABASE_URL: '' },
            },
        );

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}${result.stderr}`).toContain('DATABASE_URL is required');
    });

    it('exports a TypeORM DataSource instance', () => {
        expect(DataSource).toBeDefined();
    });
});
