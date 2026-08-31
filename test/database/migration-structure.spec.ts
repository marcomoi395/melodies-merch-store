import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(__dirname, '../../src/database/migrations/20260106151610-initial.ts');
const migrationSource = readFileSync(migrationPath, 'utf8');

describe('initial TypeORM migration', () => {
    it('creates every authoritative table and schema object', () => {
        const tables = [
            'users',
            'roles',
            'permissions',
            'user_roles',
            'role_permissions',
            'artists',
            'categories',
            'products',
            'product_artists',
            'product_variants',
            'variant_attributes',
            'carts',
            'cart_items',
            'orders',
            'order_items',
            'discounts',
            'discount_usages',
            'transactions',
            'posts',
            'audit_logs',
        ];

        expect(migrationSource).toContain('class Initial20260106151610');
        expect(migrationSource.match(/CREATE TABLE/g)).toHaveLength(20);
        for (const table of tables) {
            expect(migrationSource).toContain(`CREATE TABLE "${table}"`);
        }
        expect(migrationSource).toContain('is_pulished');
        expect(migrationSource.match(/CREATE UNIQUE INDEX/g)).toHaveLength(11);
        expect(migrationSource.match(/ADD CONSTRAINT/g)).toHaveLength(24);
    });

    it('defines reversible migration methods', () => {
        expect(migrationSource).toMatch(/async up\(queryRunner: QueryRunner\)/);
        expect(migrationSource).toMatch(/async down\(queryRunner: QueryRunner\)/);
        expect(migrationSource).toContain('DROP TABLE IF EXISTS "users" CASCADE');
        expect(migrationSource).toContain('DROP TABLE IF EXISTS "audit_logs" CASCADE');
    });
});
