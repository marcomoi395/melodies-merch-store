import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source';
import { TYPEORM_MIGRATIONS_TABLE } from '../../src/database/database-options';
import { createSchema, dropSchema, inSchema } from './postgres-lifecycle';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const legacySchema = readFileSync(join(__dirname, 'legacy-schema.sql'), 'utf8');

interface RepresentativeRows {
    users: unknown[];
    categories: unknown[];
    products: unknown[];
}

function runAdoptionCli(databaseUrl: string, schema: string) {
    if (!process.env.TEST_SHADOW_DATABASE_URL) {
        throw new Error('TEST_SHADOW_DATABASE_URL is required for adoption tests');
    }
    return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'migration:adopt'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            DATABASE_SCHEMA: schema,
            SHADOW_DATABASE_URL: process.env.TEST_SHADOW_DATABASE_URL,
        },
    });
}

async function representativeRows(
    dataSource: DataSource,
    schema: string,
): Promise<RepresentativeRows> {
    const [users, categories, products] = await Promise.all([
        dataSource.query(`SELECT id, email FROM "${schema}".users ORDER BY id`),
        dataSource.query(`SELECT id, name FROM "${schema}".categories ORDER BY id`),
        dataSource.query(`SELECT id, name FROM "${schema}".products ORDER BY id`),
    ]);
    return { users, categories, products };
}

describeDatabase('TypeORM adoption rehearsal PostgreSQL e2e', () => {
    let dataSource: DataSource | undefined;
    let schema: string;
    let isolatedDatabaseUrl: string;

    beforeAll(async () => {
        isolatedDatabaseUrl = process.env.TEST_DATABASE_URL!;
        schema = `test_adoption_${randomUUID().replaceAll('-', '')}`;
        try {
            await createSchema(isolatedDatabaseUrl, schema);
            await inSchema(isolatedDatabaseUrl, schema, async (client) => {
                await client.query(legacySchema);
                await client.query(
                    `INSERT INTO users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'existing@example.test');
                     INSERT INTO categories (id, name) VALUES ('00000000-0000-0000-0000-000000000002', 'Existing category');
                     INSERT INTO products (id, name, category_id, product_type, updated_at)
                     VALUES ('00000000-0000-0000-0000-000000000003', 'Existing product', '00000000-0000-0000-0000-000000000002', 'PHYSICAL', CURRENT_TIMESTAMP);`,
                );
            });
            dataSource = new DataSource(
                createDataSourceOptions({
                    DATABASE_URL: isolatedDatabaseUrl,
                    DATABASE_SCHEMA: schema,
                }),
            );
            await dataSource.initialize();
        } catch (error) {
            await dropSchema(isolatedDatabaseUrl, schema);
            throw error;
        }
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
        if (isolatedDatabaseUrl && schema) {
            await dropSchema(isolatedDatabaseUrl, schema);
        }
        if (process.env.TEST_SHADOW_DATABASE_URL && schema) {
            await dropSchema(process.env.TEST_SHADOW_DATABASE_URL, schema);
        }
    });

    it('preflights the legacy schema read-only, then fake-baselines TypeORM without changing rows', async () => {
        const before = await representativeRows(dataSource!, schema);

        expect(
            await dataSource!.query(`SELECT to_regclass($1) AS table`, [
                `${schema}.${TYPEORM_MIGRATIONS_TABLE}`,
            ]),
        ).toEqual([{ table: null }]);
        expect(await representativeRows(dataSource!, schema)).toEqual(before);

        const result = runAdoptionCli(isolatedDatabaseUrl, schema);
        if (result.status !== 0) {
            throw new Error(`${result.stdout}${result.stderr}`);
        }
        expect(await dataSource!.runMigrations()).toEqual([]);
        expect(
            await dataSource!.query(`SELECT name FROM "${schema}"."${TYPEORM_MIGRATIONS_TABLE}"`),
        ).toEqual([{ name: 'Initial20260106151610' }]);
        expect(await representativeRows(dataSource!, schema)).toEqual(before);
    });

    it('rejects drift before writing TypeORM migration history', async () => {
        const driftSchema = `test_adoption_drift_${randomUUID().replaceAll('-', '')}`;
        try {
            await createSchema(isolatedDatabaseUrl, driftSchema);
            await inSchema(isolatedDatabaseUrl, driftSchema, async (client) => {
                await client.query(legacySchema);
                await client.query(`ALTER TABLE users DROP COLUMN email`);
            });
        } catch (error) {
            await dropSchema(isolatedDatabaseUrl, driftSchema);
            throw error;
        }

        const driftDataSource = new DataSource(
            createDataSourceOptions({
                DATABASE_URL: isolatedDatabaseUrl,
                DATABASE_SCHEMA: driftSchema,
            }),
        );
        await driftDataSource.initialize();
        try {
            const result = runAdoptionCli(isolatedDatabaseUrl, driftSchema);
            expect(result.status).not.toBe(0);
            expect(`${result.stdout}${result.stderr}`).toContain('Schema preflight failed');
            expect(
                await driftDataSource.query(`SELECT to_regclass($1) AS table`, [
                    `${driftSchema}.${TYPEORM_MIGRATIONS_TABLE}`,
                ]),
            ).toEqual([{ table: null }]);
        } finally {
            await driftDataSource.destroy();
            await dropSchema(isolatedDatabaseUrl, driftSchema);
            if (process.env.TEST_SHADOW_DATABASE_URL) {
                await dropSchema(process.env.TEST_SHADOW_DATABASE_URL, driftSchema);
            }
        }
    });
});
