import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';
import { TYPEORM_MIGRATIONS_TABLE } from '../../src/database/database-options';
import { expectSchemaParity } from './schema-parity';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const prismaMigration = readFileSync(
    join(__dirname, '../../prisma/migrations/20260106151610_init_db/migration.sql'),
    'utf8',
);

async function representativeRows(dataSource: DataSource): Promise<unknown[]> {
    return Promise.all([
        dataSource.query(`SELECT id, email FROM users ORDER BY id`),
        dataSource.query(`SELECT id, name FROM categories ORDER BY id`),
        dataSource.query(`SELECT id, name FROM products ORDER BY id`),
    ]);
}

describeDatabase('TypeORM adoption rehearsal PostgreSQL e2e', () => {
    let dataSource: DataSource;
    let schema: string;
    let isolatedDatabaseUrl: string;

    beforeAll(async () => {
        isolatedDatabaseUrl = process.env.TEST_DATABASE_URL!;
        schema = `test_adoption_${randomUUID().replaceAll('-', '')}`;
        const client = new Client({ connectionString: isolatedDatabaseUrl });
        await client.connect();
        try {
            await client.query(`CREATE SCHEMA "${schema}"`);
            await client.query(`SET search_path TO "${schema}"`);
            await client.query(prismaMigration);
            await client.query(
                `INSERT INTO users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'existing@example.test');
                 INSERT INTO categories (id, name) VALUES ('00000000-0000-0000-0000-000000000002', 'Existing category');
                 INSERT INTO products (id, name, category_id, product_type, updated_at)
                 VALUES ('00000000-0000-0000-0000-000000000003', 'Existing product', '00000000-0000-0000-0000-000000000002', 'PHYSICAL', CURRENT_TIMESTAMP);`,
            );
        } finally {
            await client.end();
        }

        dataSource = new DataSource(
            createDataSourceOptions({
                DATABASE_URL: isolatedDatabaseUrl,
                DATABASE_SCHEMA: schema,
            }),
        );
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource?.destroy();
        const client = new Client({ connectionString: isolatedDatabaseUrl });
        await client.connect();
        try {
            await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
            await client.end();
        }
    });

    it('preflights Prisma schema read-only, then fake-baselines TypeORM without changing rows', async () => {
        const before = await representativeRows(dataSource);

        await expectSchemaParity(dataSource);

        expect(
            await dataSource.query(`SELECT to_regclass($1) AS table`, [
                `${schema}.${TYPEORM_MIGRATIONS_TABLE}`,
            ]),
        ).toEqual([{ table: null }]);
        expect(await representativeRows(dataSource)).toEqual(before);

        await expect(dataSource.runMigrations({ fake: true })).resolves.toHaveLength(1);
        expect(await dataSource.runMigrations()).toEqual([]);
        expect(
            await dataSource.query(`SELECT name FROM "${schema}"."${TYPEORM_MIGRATIONS_TABLE}"`),
        ).toEqual([{ name: 'Initial20260106151610' }]);
        expect(await representativeRows(dataSource)).toEqual(before);
    });

    it('rejects drift before writing TypeORM migration history', async () => {
        const driftSchema = `test_adoption_drift_${randomUUID().replaceAll('-', '')}`;
        const client = new Client({ connectionString: isolatedDatabaseUrl });
        await client.connect();
        try {
            await client.query(`CREATE SCHEMA "${driftSchema}"`);
            await client.query(`SET search_path TO "${driftSchema}"`);
            await client.query(prismaMigration);
            await client.query(`ALTER TABLE users DROP COLUMN email`);
        } finally {
            await client.end();
        }

        const driftDataSource = new DataSource(
            createDataSourceOptions({
                DATABASE_URL: isolatedDatabaseUrl,
                DATABASE_SCHEMA: driftSchema,
            }),
        );
        await driftDataSource.initialize();
        try {
            await expect(expectSchemaParity(driftDataSource)).rejects.toThrow();
            expect(
                await driftDataSource.query(`SELECT to_regclass($1) AS table`, [
                    `${driftSchema}.${TYPEORM_MIGRATIONS_TABLE}`,
                ]),
            ).toEqual([{ table: null }]);
        } finally {
            await driftDataSource.destroy();
            const cleanupClient = new Client({ connectionString: isolatedDatabaseUrl });
            await cleanupClient.connect();
            try {
                await cleanupClient.query(`DROP SCHEMA IF EXISTS "${driftSchema}" CASCADE`);
            } finally {
                await cleanupClient.end();
            }
        }
    });
});
