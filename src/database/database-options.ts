import { DataSourceOptions } from 'typeorm';

export const TYPEORM_MIGRATIONS_TABLE = 'typeorm_migrations';

export interface DatabaseEnvironment {
    DATABASE_URL?: string;
    DATABASE_SCHEMA?: string;
}

export function createDataSourceOptions(
    environment: DatabaseEnvironment | NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
    if (!environment.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }

    return {
        type: 'postgres',
        url: environment.DATABASE_URL,
        schema: environment.DATABASE_SCHEMA,
        entities: [__dirname + '/entities/**/*{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        subscribers: [__dirname + '/subscribers/**/*{.ts,.js}'],
        migrationsTableName: TYPEORM_MIGRATIONS_TABLE,
        synchronize: false,
    };
}
