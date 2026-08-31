import { readFileSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/database/data-source';
import { createDataSourceOptions } from '../../src/database/database-options';

describe('TypeORM DataSource configuration', () => {
    it('loads DATABASE_URL, disables synchronization, and registers migrations', () => {
        const options = createDataSourceOptions({
            DATABASE_URL: 'postgresql://localhost/melodies',
        });

        expect(options.type).toBe('postgres');
        expect(options.url).toBe('postgresql://localhost/melodies');
        expect(options.synchronize).toBe(false);
        expect(options.migrations).toEqual(
            expect.arrayContaining([expect.stringContaining('migrations')]),
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
        expect(packageJson.scripts['migration:run']).toBeUndefined();
        expect(packageJson.scripts['migration:revert']).toBeUndefined();
    });

    it('fails when DATABASE_URL is missing', () => {
        expect(() => createDataSourceOptions({})).toThrow('DATABASE_URL');
    });

    it('exports a TypeORM DataSource instance', () => {
        expect(DataSource).toBeDefined();
    });
});
