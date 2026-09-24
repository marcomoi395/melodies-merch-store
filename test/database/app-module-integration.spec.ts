import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appModuleSource = readFileSync(join(__dirname, '../../src/app.module.ts'), 'utf8');

describe('Nest database integration wiring', () => {
    it('registers the shared TypeORM module', () => {
        expect(appModuleSource).toContain(
            "import { DatabaseModule } from './database/database.module';",
        );
        expect(appModuleSource).toMatch(/imports:\s*\[[\s\S]*DatabaseModule,/);
    });

    it('keeps TypeORM synchronization disabled', () => {
        const databaseModuleSource = readFileSync(
            join(__dirname, '../../src/database/database.module.ts'),
            'utf8',
        );
        const optionsSource = readFileSync(
            join(__dirname, '../../src/database/database-options.ts'),
            'utf8',
        );

        expect(optionsSource).toContain('synchronize: false');
        expect(databaseModuleSource).toContain('createDataSourceOptions');
    });
});
