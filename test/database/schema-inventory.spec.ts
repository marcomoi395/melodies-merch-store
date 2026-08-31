import { propertyColumnMappings, schemaDiscrepancies, schemaInventory } from './schema-fixtures';

describe('schema inventory', () => {
    it('captures all Prisma models and mapped tables', () => {
        expect(schemaInventory).toHaveLength(20);
        expect(schemaInventory.map((table) => table.name)).toEqual([
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
        ]);
    });

    it('preserves the legacy posts column spelling', () => {
        const posts = schemaInventory.find((table) => table.name === 'posts');

        expect(posts?.columns.map((column) => column.name)).toContain('is_pulished');
    });

    it('records primary keys, uniqueness, and foreign-key actions', () => {
        const cartItems = schemaInventory.find((table) => table.name === 'cart_items');
        const categories = schemaInventory.find((table) => table.name === 'categories');

        expect(cartItems?.primaryKey).toEqual(['id']);
        expect(cartItems?.uniqueIndexes).toContainEqual([
            'cart_id',
            'product_id',
            'product_variant_id',
        ]);
        expect(categories?.foreignKeys).toContainEqual({
            columns: ['parent_id'],
            referencedTable: 'categories',
            referencedColumns: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        });
    });

    it('documents property-to-column mappings and Prisma-SQL discrepancies', () => {
        expect(propertyColumnMappings.posts.isPublished).toBe('is_pulished');
        expect(schemaDiscrepancies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ table: 'products', subject: 'timestamp precision' }),
                expect.objectContaining({ table: 'users', subject: 'updated_at default' }),
            ]),
        );
    });
    it('records UUID defaults and every authoritative timestamp precision', () => {
        const users = schemaInventory.find((table) => table.name === 'users');
        const expectedTimestampPrecision: Record<string, string[]> = {
            carts: ['updated_at'],
            discounts: ['updated_at'],
            orders: ['updated_at'],
            posts: ['updated_at'],
            products: ['created_at', 'updated_at'],
            product_variants: ['created_at', 'updated_at'],
            transactions: ['updated_at'],
            audit_logs: ['updated_at'],
        };

        expect(users?.columns.find((column) => column.name === 'id')?.prismaDefaultExpression).toBe(
            'uuid()',
        );
        for (const [tableName, columnNames] of Object.entries(expectedTimestampPrecision)) {
            const table = schemaInventory.find((candidate) => candidate.name === tableName);

            for (const columnName of columnNames) {
                expect(table?.columns.find((column) => column.name === columnName)?.type).toBe(
                    'TIMESTAMP(3)',
                );
            }
        }
        expect(users?.columns.find((column) => column.name === 'updated_at')?.type).toBe(
            'TIMESTAMP',
        );
        expect(schemaDiscrepancies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ subject: 'UUID primary-key default' }),
            ]),
        );
    });
    it('covers every Prisma camelCase property with a mapped column', () => {
        expect(Object.keys(propertyColumnMappings).sort()).toEqual(
            [
                'artists',
                'audit_logs',
                'cart_items',
                'carts',
                'categories',
                'discount_usages',
                'discounts',
                'orders',
                'order_items',
                'posts',
                'product_artists',
                'product_variants',
                'products',
                'role_permissions',
                'roles',
                'transactions',
                'user_roles',
                'users',
                'variant_attributes',
            ].sort(),
        );
        expect(propertyColumnMappings.user_roles.userId).toBe('user_id');
        expect(propertyColumnMappings.role_permissions.permissionId).toBe('permission_id');
        expect(propertyColumnMappings.orders.shippingAddress).toBe('shipping_address');
        expect(propertyColumnMappings.transactions.gatewayTransactionId).toBe(
            'gateway_transaction_id',
        );
        expect(propertyColumnMappings.audit_logs.ipAddress).toBe('ip_address');
    });
});
