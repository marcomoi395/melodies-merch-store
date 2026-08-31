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
            `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename NOT LIKE 'typeorm_%' ORDER BY tablename`,
        );
        expect(rows.map((row: { tablename: string }) => row.tablename)).toEqual(
            schemaInventory.map((table) => table.name).sort(),
        );
    });

    it('matches representative foreign-key delete actions and unique indexes', async () => {
        const foreignKeys = await dataSource.query<{ conname: string; confdeltype: string }[]>(
            `SELECT conname, confdeltype FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND contype = 'f' AND conname IN ('categories_parent_id_fkey', 'orders_user_id_fkey', 'order_items_product_id_fkey') ORDER BY conname`,
        );
        const indexes = await dataSource.query<{ indexname: string }[]>(
            `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname IN ('users_email_key', 'cart_items_cart_id_product_id_product_variant_id_key', 'posts_slug_key') ORDER BY indexname`,
        );

        expect(foreignKeys).toEqual([
            { conname: 'categories_parent_id_fkey', confdeltype: 'n' },
            { conname: 'order_items_product_id_fkey', confdeltype: 'n' },
            { conname: 'orders_user_id_fkey', confdeltype: 'n' },
        ]);
        expect(indexes.map((index) => index.indexname)).toEqual([
            'cart_items_cart_id_product_id_product_variant_id_key',
            'posts_slug_key',
            'users_email_key',
        ]);
    });
});
