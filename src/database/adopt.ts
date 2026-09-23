import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { AppDataSource } from './data-source';

const initialMigrationName = 'Initial20260106151610';

function prismaSchemaUrl(environment: NodeJS.ProcessEnv): string {
    if (!environment.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }

    const url = new URL(environment.DATABASE_URL);
    if (environment.DATABASE_SCHEMA) {
        url.searchParams.set('schema', environment.DATABASE_SCHEMA);
    }
    return url.toString();
}

function prismaShadowDatabaseUrl(environment: NodeJS.ProcessEnv): string {
    if (!environment.SHADOW_DATABASE_URL) {
        throw new Error('SHADOW_DATABASE_URL is required for adoption preflight');
    }
    const url = new URL(environment.SHADOW_DATABASE_URL);
    if (environment.DATABASE_SCHEMA) {
        url.searchParams.set('schema', environment.DATABASE_SCHEMA);
    }
    return url.toString();
}

export function preflightExistingDatabase(environment: NodeJS.ProcessEnv = process.env): void {
    const prismaEnvironment = {
        ...environment,
        DATABASE_URL: prismaSchemaUrl(environment),
        SHADOW_DATABASE_URL: prismaShadowDatabaseUrl(environment),
    };
    const result = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        [
            '--no-install',
            'prisma',
            'migrate',
            'diff',
            '--from-config-datasource',
            '--to-migrations',
            resolve(__dirname, '../../prisma/migrations'),
            '--exit-code',
        ],
        { env: prismaEnvironment, stdio: 'inherit' },
    );

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error('Schema preflight failed; refusing to fake-baseline TypeORM migrations');
    }
}

export async function adoptExistingDatabase(): Promise<void> {
    preflightExistingDatabase();
    await AppDataSource.initialize();
    try {
        const migrations = AppDataSource.migrations;
        if (migrations.length !== 1 || migrations[0]?.name !== initialMigrationName) {
            throw new Error(`Expected only ${initialMigrationName} before adoption`);
        }
        await AppDataSource.runMigrations({ fake: true });
    } finally {
        await AppDataSource.destroy();
    }
}

if (require.main === module) {
    void adoptExistingDatabase().catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    });
}
