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

    it('drops every authoritative table during rollback', () => {
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

        for (const table of tables) {
            expect(migrationSource).toContain(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }
    });
});
