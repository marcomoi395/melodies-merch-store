import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../../src/database/database.module';

describe('DatabaseModule', () => {
    it('configures TypeORM from the shared DataSource options', () => {
        const imports = Reflect.getMetadata('imports', DatabaseModule) as Array<{
            module?: unknown;
            imports?: unknown[];
        }>;
        const typeOrmImport = imports.find((entry) => entry.module === TypeOrmModule);

        expect(typeOrmImport).toBeDefined();
        expect(typeOrmImport?.imports).toContainEqual(expect.anything());
    });
});
