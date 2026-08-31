import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';
import { schemaInventory } from './schema-fixtures';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('TypeORM schema parity PostgreSQL e2e', () => {
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

    it('matches all inventory table names', async () => {
        const rows = await dataSource.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'typeorm_%' ORDER BY tablename`,
        );
        expect(rows.map((row: { tablename: string }) => row.tablename)).toEqual(
            schemaInventory.map((table) => table.name).sort(),
        );
    });
});
