import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('TypeORM migration PostgreSQL e2e', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource(
            createDataSourceOptions({
                DATABASE_URL: process.env.DATABASE_URL,
            }),
        );
        await dataSource.initialize();
        await dataSource.runMigrations();
    });

    afterAll(async () => {
        await dataSource.undoLastMigration();
        await dataSource.destroy();
    });

    it('creates all 20 tables and supports idempotent reruns', async () => {
        const tables = await dataSource.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'typeorm_%'`,
        );
        expect(tables).toHaveLength(20);
        await expect(dataSource.runMigrations()).resolves.toEqual([]);
    });
});
