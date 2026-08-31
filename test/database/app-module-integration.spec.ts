import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const appModuleSource = readFileSync(join(__dirname, '../../src/app.module.ts'), 'utf8');

describe('Nest database integration wiring', () => {
    it('registers TypeORM alongside the existing Prisma module', () => {
        expect(appModuleSource).toContain(
            "import { DatabaseModule } from './database/database.module';",
        );
        expect(appModuleSource).toContain("import { PrismaModule } from './prisma/prisma.module';");
        expect(appModuleSource).toMatch(/imports:\s*\[[\s\S]*DatabaseModule,[\s\S]*PrismaModule,/);
    });

    it('keeps TypeORM synchronization disabled and preserves the opt-out switch', () => {
        const databaseModuleSource = readFileSync(
            join(__dirname, '../../src/database/database.module.ts'),
            'utf8',
        );
        const optionsSource = readFileSync(
            join(__dirname, '../../src/database/database-options.ts'),
            'utf8',
        );

        expect(databaseModuleSource).toContain("process.env.TYPEORM_ENABLED === 'false'");
        expect(optionsSource).toContain('synchronize: false');
        expect(databaseModuleSource).toContain('createDataSourceOptions');
    });
    it('keeps feature modules independent from TypeORM repositories', () => {
        expect(appModuleSource).toContain("import { PrismaModule } from './prisma/prisma.module';");
        expect(appModuleSource).not.toContain('TypeOrmModule.forFeature');
    });
});
