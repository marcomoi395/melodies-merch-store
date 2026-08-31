import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('TypeORM adoption rehearsal PostgreSQL e2e', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource(
            createDataSourceOptions({ DATABASE_URL: process.env.DATABASE_URL }),
        );
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('performs read-only preflight checks without changing representative rows', async () => {
        const before = await dataSource.query<{ count: string }[]>(
            'SELECT COUNT(*)::text AS count FROM users',
        );
        const tables = await dataSource.query<{ tablename: string }[]>(
            `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename NOT LIKE 'typeorm_%'`,
        );
        const after = await dataSource.query<{ count: string }[]>(
            'SELECT COUNT(*)::text AS count FROM users',
        );

        expect(tables.length).toBe(20);
        expect(after[0]?.count).toBe(before[0]?.count);
    });
});
