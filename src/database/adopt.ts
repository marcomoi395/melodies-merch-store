import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './data-source';

const initialMigrationName = 'Initial20260106151610';

function databaseUrl(environment: NodeJS.ProcessEnv): string {
    if (!environment.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }

    const url = new URL(environment.DATABASE_URL);
    if (environment.DATABASE_SCHEMA) {
        url.searchParams.set('schema', environment.DATABASE_SCHEMA);
    }
    return url.toString();
}

function shadowDatabaseUrl(environment: NodeJS.ProcessEnv): string {
    if (!environment.SHADOW_DATABASE_URL) {
        throw new Error('SHADOW_DATABASE_URL is required for adoption preflight');
    }
    const url = new URL(environment.SHADOW_DATABASE_URL);
    url.searchParams.delete('schema');
    return url.toString();
}

interface CatalogRow {
    table_name: string;
    definition: string;
}

async function catalog(dataSource: DataSource, schema: string): Promise<CatalogRow[]> {
    const rows = await dataSource.query<CatalogRow[]>(
        `SELECT tableName.relname AS table_name,
                pg_get_constraintdef(constraintRow.oid, true) AS definition
         FROM pg_constraint constraintRow
         JOIN pg_class tableName ON tableName.oid = constraintRow.conrelid
         JOIN pg_namespace namespace ON namespace.oid = tableName.relnamespace
         WHERE namespace.nspname = $1 AND tableName.relname <> 'typeorm_migrations'
         UNION ALL
         SELECT tableName.relname,
                concat_ws('|', catalogIndex.indisunique, catalogIndex.indisvalid,
                    array_to_string(array_agg(attribute.attname ORDER BY key.ordinality), ','),
                    pg_get_expr(catalogIndex.indpred, catalogIndex.indrelid))
         FROM pg_index catalogIndex
         JOIN pg_class tableName ON tableName.oid = catalogIndex.indrelid
         JOIN pg_namespace namespace ON namespace.oid = tableName.relnamespace
         JOIN unnest(catalogIndex.indkey) WITH ORDINALITY AS key(attribute_number, ordinality) ON true
         JOIN pg_attribute attribute ON attribute.attrelid = tableName.oid
            AND attribute.attnum = key.attribute_number
         WHERE namespace.nspname = $1 AND tableName.relname <> 'typeorm_migrations'
            AND NOT catalogIndex.indisprimary
         GROUP BY tableName.relname, catalogIndex.indexrelid, catalogIndex.indisunique,
                  catalogIndex.indisvalid, catalogIndex.indpred, catalogIndex.indrelid
         UNION ALL
         SELECT table_name,
                concat_ws('|', column_name, data_type, is_nullable, column_default,
                    character_maximum_length, numeric_precision, numeric_scale, datetime_precision)
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name <> 'typeorm_migrations'
         ORDER BY table_name, definition`,
        [schema],
    );
    return rows.map((row) => ({
        ...row,
        definition: row.definition.replaceAll(`${schema}.`, ''),
    }));
}

function schemaName(environment: NodeJS.ProcessEnv): string {
    return environment.DATABASE_SCHEMA ?? 'public';
}

export async function preflightExistingDatabase(
    environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
    const targetUrl = databaseUrl(environment);
    const shadowUrl = shadowDatabaseUrl(environment);
    const targetSchema = schemaName(environment);
    const shadowSchema = `typeorm_preflight_${randomUUID().replaceAll('-', '')}`;
    const shadowAdmin = new DataSource(createDataSourceOptions({ DATABASE_URL: shadowUrl }));
    let target: DataSource | undefined;
    let shadow: DataSource | undefined;

    try {
        await shadowAdmin.initialize();
        await shadowAdmin.query(`CREATE SCHEMA "${shadowSchema}"`);
        shadow = new DataSource(
            createDataSourceOptions({ DATABASE_URL: shadowUrl, DATABASE_SCHEMA: shadowSchema }),
        );
        target = new DataSource(
            createDataSourceOptions({ DATABASE_URL: targetUrl, DATABASE_SCHEMA: targetSchema }),
        );
        await shadow.initialize();
        await shadow.runMigrations();
        await target.initialize();

        const [expected, actual] = await Promise.all([
            catalog(shadow, shadowSchema),
            catalog(target, targetSchema),
        ]);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            const mismatchIndex = expected.findIndex((entry, index) => {
                return JSON.stringify(entry) !== JSON.stringify(actual[index]);
            });
            const mismatch = expected[mismatchIndex];
            throw new Error(
                `Schema preflight failed; refusing to fake-baseline TypeORM migrations${mismatch ? ` near ${mismatch.table_name}` : ''}`,
            );
        }
    } finally {
        if (target?.isInitialized) {
            await target.destroy();
        }
        if (shadow?.isInitialized) {
            await shadow.destroy();
        }
        if (shadowAdmin.isInitialized) {
            await shadowAdmin.query(`DROP SCHEMA IF EXISTS "${shadowSchema}" CASCADE`);
            await shadowAdmin.destroy();
        }
    }
}

export async function adoptExistingDatabase(): Promise<void> {
    await preflightExistingDatabase();
    const dataSource = new DataSource(createDataSourceOptions());
    await dataSource.initialize();
    try {
        const migrations = dataSource.migrations;
        if (migrations.length !== 1 || migrations[0]?.name !== initialMigrationName) {
            throw new Error(`Expected only ${initialMigrationName} before adoption`);
        }
        await dataSource.runMigrations({ fake: true });
    } finally {
        await dataSource.destroy();
    }
}

if (require.main === module) {
    void adoptExistingDatabase().catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    });
}
