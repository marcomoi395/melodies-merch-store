import { DataSource } from 'typeorm';
import { TYPEORM_MIGRATIONS_TABLE } from '../../src/database/database-options';
import { SchemaForeignKeyFixture, schemaInventory } from './schema-fixtures';

interface ColumnRow {
    table_name: string;
    column_name: string;
    data_type: string;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    datetime_precision: number | null;
    is_nullable: 'YES' | 'NO';
    column_default: string | null;
}

const defaultExpression = (value: string | null): string | undefined =>
    value
        ?.replace(/::[a-z ]+(?:\([^)]*\))?/gi, '')
        .replace(/^\((.*)\)$/, '$1')
        .toUpperCase();

const expectedType = (
    type: string,
): Pick<
    ColumnRow,
    | 'data_type'
    | 'character_maximum_length'
    | 'numeric_precision'
    | 'numeric_scale'
    | 'datetime_precision'
> => {
    const match = /^(\w+)(?:\((\d+)(?:,(\d+))?\))?$/.exec(type);
    if (!match) {
        throw new Error(`Unsupported inventory type: ${type}`);
    }

    const [, base, first, second] = match;
    switch (base) {
        case 'VARCHAR':
            return {
                data_type: 'character varying',
                character_maximum_length: first ? Number(first) : null,
                numeric_precision: null,
                numeric_scale: null,
                datetime_precision: null,
            };
        case 'DECIMAL':
            return {
                data_type: 'numeric',
                character_maximum_length: null,
                numeric_precision: first ? Number(first) : null,
                numeric_scale: second ? Number(second) : null,
                datetime_precision: null,
            };
        case 'TIMESTAMP':
            return {
                data_type: 'timestamp without time zone',
                character_maximum_length: null,
                numeric_precision: null,
                numeric_scale: null,
                datetime_precision: first ? Number(first) : 6,
            };
        case 'INTEGER':
            return {
                data_type: 'integer',
                character_maximum_length: null,
                numeric_precision: 32,
                numeric_scale: 0,
                datetime_precision: null,
            };
        default:
            return {
                data_type: base.toLowerCase(),
                character_maximum_length: null,
                numeric_precision: null,
                numeric_scale: null,
                datetime_precision: null,
            };
    }
};

const foreignKeyAction = (actionCode: string): 'CASCADE' | 'SET NULL' => {
    if (actionCode === 'c') {
        return 'CASCADE';
    }
    if (actionCode === 'n') {
        return 'SET NULL';
    }
    throw new Error(`Unsupported PostgreSQL foreign-key action: ${actionCode}`);
};

export async function expectSchemaParity(dataSource: DataSource): Promise<void> {
    const schema = (dataSource.options as any).schema as string;
    const columns = await dataSource.query<ColumnRow[]>(
        `SELECT table_name, column_name, data_type, character_maximum_length, numeric_precision,
                numeric_scale, datetime_precision, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name <> $2
         ORDER BY table_name, ordinal_position`,
        [schema, TYPEORM_MIGRATIONS_TABLE],
    );
    const actualTables = [...new Set(columns.map((column) => column.table_name))];
    expect(actualTables).toEqual(schemaInventory.map((table) => table.name).sort());

    for (const table of schemaInventory) {
        const actualColumns = columns.filter((column) => column.table_name === table.name);
        expect(actualColumns.map((column) => column.column_name)).toEqual(
            table.columns.map((column) => column.name),
        );
        for (const expected of table.columns) {
            const actual = actualColumns.find((column) => column.column_name === expected.name);
            expect(actual).toBeDefined();
            expect(actual).toMatchObject({
                ...expectedType(expected.type),
                is_nullable: expected.nullable ? 'YES' : 'NO',
            });
            expect(defaultExpression(actual?.column_default ?? null)).toBe(
                defaultExpression(expected.defaultExpression ?? null),
            );
        }
    }

    const primaryKeys = await dataSource.query<{ table_name: string; columns: string[] }[]>(
        `SELECT table_name, array_agg(column_name ORDER BY ordinal_position)::text[] AS columns
         FROM information_schema.key_column_usage
         WHERE table_schema = $1 AND constraint_name LIKE '%_pkey'
         GROUP BY table_name ORDER BY table_name`,
        [schema],
    );
    expect(primaryKeys).toEqual(
        schemaInventory
            .map((table) => ({ table_name: table.name, columns: table.primaryKey }))
            .sort((left, right) => left.table_name.localeCompare(right.table_name)),
    );

    const uniqueIndexes = await dataSource.query<{ table_name: string; columns: string[] }[]>(
        `SELECT tableName.relname AS table_name, array_agg(attribute.attname ORDER BY key.ordinality)::text[] AS columns
         FROM pg_index index
         JOIN pg_class tableName ON tableName.oid = index.indrelid
         JOIN pg_namespace namespace ON namespace.oid = tableName.relnamespace
         JOIN unnest(index.indkey) WITH ORDINALITY AS key(attribute_number, ordinality) ON true
         JOIN pg_attribute attribute ON attribute.attrelid = tableName.oid AND attribute.attnum = key.attribute_number
         WHERE namespace.nspname = $1 AND index.indisunique AND NOT index.indisprimary
         GROUP BY tableName.relname, index.indexrelid
         ORDER BY tableName.relname, columns`,
        [schema],
    );
    expect(uniqueIndexes).toEqual(
        schemaInventory
            .flatMap((table) =>
                (table.uniqueIndexes ?? []).map((columns) => ({ table_name: table.name, columns })),
            )
            .sort((left, right) =>
                `${left.table_name}:${left.columns.join(',')}`.localeCompare(
                    `${right.table_name}:${right.columns.join(',')}`,
                ),
            ),
    );

    const foreignKeys = await dataSource.query<
        {
            table_name: string;
            columns: string[];
            referenced_table: string;
            referenced_columns: string[];
            delete_action: string;
            update_action: string;
        }[]
    >(
        `SELECT source.relname AS table_name,
                array_agg(sourceAttribute.attname ORDER BY sourceKey.ordinality)::text[] AS columns,
                target.relname AS referenced_table,
                array_agg(targetAttribute.attname ORDER BY targetKey.ordinality)::text[] AS referenced_columns,
                foreignKeyConstraint.confdeltype AS delete_action, foreignKeyConstraint.confupdtype AS update_action
         FROM pg_constraint foreignKeyConstraint
         JOIN pg_class source ON source.oid = foreignKeyConstraint.conrelid
         JOIN pg_namespace namespace ON namespace.oid = source.relnamespace
         JOIN pg_class target ON target.oid = foreignKeyConstraint.confrelid
         JOIN unnest(foreignKeyConstraint.conkey) WITH ORDINALITY AS sourceKey(attribute_number, ordinality) ON true
         JOIN unnest(foreignKeyConstraint.confkey) WITH ORDINALITY AS targetKey(attribute_number, ordinality) ON targetKey.ordinality = sourceKey.ordinality
         JOIN pg_attribute sourceAttribute ON sourceAttribute.attrelid = source.oid AND sourceAttribute.attnum = sourceKey.attribute_number
         JOIN pg_attribute targetAttribute ON targetAttribute.attrelid = target.oid AND targetAttribute.attnum = targetKey.attribute_number
         WHERE namespace.nspname = $1 AND foreignKeyConstraint.contype = 'f'
         GROUP BY source.relname, target.relname, foreignKeyConstraint.oid
         ORDER BY source.relname, columns`,
        [schema],
    );
    const expectedForeignKeys = schemaInventory
        .flatMap((table) =>
            (table.foreignKeys ?? []).map((foreignKey: SchemaForeignKeyFixture) => ({
                table_name: table.name,
                columns: foreignKey.columns,
                referenced_table: foreignKey.referencedTable,
                referenced_columns: foreignKey.referencedColumns,
                delete_action: foreignKey.onDelete,
                update_action: foreignKey.onUpdate,
            })),
        )
        .sort((left, right) =>
            `${left.table_name}:${left.columns.join(',')}`.localeCompare(
                `${right.table_name}:${right.columns.join(',')}`,
            ),
        );
    expect(
        foreignKeys.map((key) => ({
            ...key,
            delete_action: foreignKeyAction(key.delete_action),
            update_action: foreignKeyAction(key.update_action),
        })),
    ).toEqual(expectedForeignKeys);
}
