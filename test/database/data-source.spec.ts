import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';

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

    it('fails when DATABASE_URL is missing', () => {
        expect(() => createDataSourceOptions({})).toThrow('DATABASE_URL');
    });

    it('exports a TypeORM DataSource instance', () => {
        expect(DataSource).toBeDefined();
    });
});
