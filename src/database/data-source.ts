import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

export interface DatabaseEnvironment {
    DATABASE_URL?: string;
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
        entities: [__dirname + '/entities/**/*{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        synchronize: false,
    };
}

export const AppDataSource = new DataSource(createDataSourceOptions());
