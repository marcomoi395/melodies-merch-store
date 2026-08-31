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
});
