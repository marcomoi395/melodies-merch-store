import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { createDataSourceOptions } from '../../src/database/data-source';
import { TYPEORM_MIGRATIONS_TABLE } from '../../src/database/database-options';
import { expectSchemaParity } from './schema-parity';
import { createSchema, dropSchema } from './postgres-lifecycle';
import { CategoryEntity } from '../../src/database/entities/category.entity';
import { ProductEntity } from '../../src/database/entities/product.entity';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('TypeORM migration PostgreSQL e2e', () => {
    let dataSource: DataSource | undefined;
    let schema: string;
    let databaseUrl: string;

    beforeAll(async () => {
        databaseUrl = process.env.TEST_DATABASE_URL!;
        schema = `test_migration_${randomUUID().replaceAll('-', '')}`;
        try {
            await createSchema(databaseUrl, schema);
            dataSource = new DataSource(
                createDataSourceOptions({
                    DATABASE_URL: databaseUrl,
                    DATABASE_SCHEMA: schema,
                }),
            );
            await dataSource.initialize();
            await dataSource.runMigrations();
        } catch (error) {
            if (dataSource?.isInitialized) await dataSource.destroy();
            await dropSchema(databaseUrl, schema);
            throw error;
        }
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) await dataSource.destroy();
        if (databaseUrl && schema) await dropSchema(databaseUrl, schema);
    });

    it('migrates a clean schema with complete parity, writes, actions, idempotency, and rollback', async () => {
        const tables = await dataSource!.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> $2`,
            [schema, TYPEORM_MIGRATIONS_TABLE],
        );
        expect(tables).toHaveLength(20);
        await expect(dataSource!.runMigrations()).resolves.toEqual([]);
        await expectSchemaParity(dataSource!);

        await dataSource!.query(`
            INSERT INTO users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'user@example.test');
            INSERT INTO roles (id, name) VALUES ('00000000-0000-0000-0000-000000000002', 'admin');
            INSERT INTO permissions (id, name) VALUES ('00000000-0000-0000-0000-000000000003', 'catalog:read');
            INSERT INTO user_roles VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
            INSERT INTO role_permissions VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
            INSERT INTO artists (id, stage_name, slug) VALUES ('00000000-0000-0000-0000-000000000004', 'Artist', 'artist');
            INSERT INTO categories (id, name) VALUES ('00000000-0000-0000-0000-000000000005', 'Parent');
            INSERT INTO categories (id, name, parent_id) VALUES ('00000000-0000-0000-0000-000000000006', 'Child', '00000000-0000-0000-0000-000000000005');
            INSERT INTO products (id, name, category_id, product_type, updated_at) VALUES ('00000000-0000-0000-0000-000000000007', 'Product', '00000000-0000-0000-0000-000000000006', 'PHYSICAL', CURRENT_TIMESTAMP);
            INSERT INTO product_artists VALUES ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000004');
            INSERT INTO product_variants (id, product_id, sku, name, original_price, updated_at) VALUES ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', 'SKU-1', 'Standard', 100, CURRENT_TIMESTAMP);
            INSERT INTO variant_attributes (id, variant_id, key, value) VALUES ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000008', 'size', 'M');
            INSERT INTO carts (id, user_id, updated_at) VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP);
            INSERT INTO cart_items (id, cart_id, product_id, product_variant_id) VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008');
            INSERT INTO orders (id, user_id, subtotal, shipping_fee, total_amount, shipping_address, updated_at) VALUES ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 100, 0, 100, '{}', CURRENT_TIMESTAMP);
            INSERT INTO order_items (id, order_id, product_id, product_variant_id, product_name, variant_name, quantity, price, original_price, discount_percentage, total_line_price) VALUES ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'Product', 'Standard', 1, 100, 100, 0, 100);
            INSERT INTO discounts (id, value, updated_at) VALUES ('00000000-0000-0000-0000-000000000014', 10, CURRENT_TIMESTAMP);
            INSERT INTO discount_usages (id, discount_id, user_id, order_id) VALUES ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012');
            INSERT INTO transactions (id, order_id, updated_at) VALUES ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000012', CURRENT_TIMESTAMP);
            INSERT INTO posts (id, title, author_id, is_pulished, updated_at) VALUES ('00000000-0000-0000-0000-000000000017', 'Post', '00000000-0000-0000-0000-000000000001', true, CURRENT_TIMESTAMP);
            INSERT INTO audit_logs (id, actor_id, action, resource, updated_at) VALUES ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'CREATE', 'product', CURRENT_TIMESTAMP);
        `);
        await expect(
            dataSource!.query(
                `DELETE FROM categories WHERE id = '00000000-0000-0000-0000-000000000005'`,
            ),
        ).resolves.toBeDefined();
        await expect(
            dataSource!.query(
                `DELETE FROM products WHERE id = '00000000-0000-0000-0000-000000000007'`,
            ),
        ).resolves.toBeDefined();
        await expect(
            dataSource!.query(`DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001'`),
        ).resolves.toBeDefined();
        expect(
            await dataSource!.query(
                `SELECT parent_id FROM categories WHERE id = '00000000-0000-0000-0000-000000000006'`,
            ),
        ).toEqual([{ parent_id: null }]);
        expect(
            await dataSource!.query(
                `SELECT user_id FROM orders WHERE id = '00000000-0000-0000-0000-000000000012'`,
            ),
        ).toEqual([{ user_id: null }]);
        expect(
            await dataSource!.query(
                `SELECT product_id, product_variant_id FROM order_items WHERE id = '00000000-0000-0000-0000-000000000013'`,
            ),
        ).toEqual([{ product_id: null, product_variant_id: null }]);
        expect(await dataSource!.query(`SELECT count(*)::int AS count FROM cart_items`)).toEqual([
            { count: 0 },
        ]);
        expect(
            await dataSource!.query(
                `SELECT author_id FROM posts WHERE id = '00000000-0000-0000-0000-000000000017'`,
            ),
        ).toEqual([{ author_id: null }]);

        const timestampCategory = await dataSource!.getRepository(CategoryEntity).save({
            id: randomUUID(),
            name: 'Timestamp category',
        });
        const productRepository = dataSource!.getRepository(ProductEntity);
        const timestampProduct = await productRepository.save({
            id: randomUUID(),
            name: 'Timestamp product',
            categoryId: timestampCategory.id,
            productType: 'PHYSICAL',
        });
        const insertedProduct = timestampProduct;
        const insertedUpdatedAt = insertedProduct.updatedAt;
        await new Promise((resolve) => setTimeout(resolve, 5));
        timestampProduct.name = 'Updated timestamp product';
        const updatedTimestampProduct = await productRepository.save(timestampProduct);
        expect(updatedTimestampProduct.updatedAt.getTime()).toBeGreaterThan(insertedUpdatedAt.getTime());

        await dataSource!.query(`CREATE TABLE migration_sentinel (id INTEGER PRIMARY KEY)`);

        await dataSource!.undoLastMigration();
        const rolledBackTables = await dataSource!.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> $2`,
            [schema, TYPEORM_MIGRATIONS_TABLE],
        );
        expect(rolledBackTables).toEqual([{ tablename: 'migration_sentinel' }]);

        await dataSource!.runMigrations();
    });
});
