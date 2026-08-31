export interface SchemaColumnFixture {
    propertyName?: string;
    name: string;
    type: string;
    nullable: boolean;
    defaultExpression?: string;
}

export interface SchemaDiscrepancyFixture {
    table: string;
    subject: string;
    prisma: string;
    sql: string;
    resolution: string;
}

export interface SchemaForeignKeyFixture {
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
    onDelete: 'CASCADE' | 'SET NULL';
    onUpdate: 'CASCADE';
}

export interface SchemaTableFixture {
    name: string;
    columns: SchemaColumnFixture[];
    primaryKey: string[];
    uniqueIndexes?: string[][];
    foreignKeys?: SchemaForeignKeyFixture[];
}

const uuid = (name: string, nullable = false): SchemaColumnFixture => ({
    name,
    type: 'UUID',
    nullable,
});
const varchar = (name: string, length?: number, nullable = false): SchemaColumnFixture => ({
    name,
    type: length ? `VARCHAR(${length})` : 'VARCHAR',
    nullable,
});
const text = (name: string, nullable = true): SchemaColumnFixture => ({
    name,
    type: 'TEXT',
    nullable,
});
const timestamp = (
    name: string,
    nullable: boolean,
    defaultExpression?: string,
): SchemaColumnFixture => ({ name, type: 'TIMESTAMP', nullable, defaultExpression });
const jsonb = (name: string, nullable = true): SchemaColumnFixture => ({
    name,
    type: 'JSONB',
    nullable,
});
const decimal = (
    name: string,
    precision?: number,
    scale?: number,
    nullable = false,
): SchemaColumnFixture => ({
    name,
    type: precision ? `DECIMAL(${precision},${scale})` : 'DECIMAL',
    nullable,
});
const integer = (
    name: string,
    nullable = false,
    defaultExpression?: string,
): SchemaColumnFixture => ({ name, type: 'INTEGER', nullable, defaultExpression });
const boolean = (
    name: string,
    nullable = false,
    defaultExpression?: string,
): SchemaColumnFixture => ({ name, type: 'BOOLEAN', nullable, defaultExpression });
const fk = (
    columns: string[],
    referencedTable: string,
    onDelete: 'CASCADE' | 'SET NULL',
): SchemaForeignKeyFixture => ({
    columns,
    referencedTable,
    referencedColumns: ['id'],
    onDelete,
    onUpdate: 'CASCADE',
});

export const schemaInventory: SchemaTableFixture[] = [
    {
        name: 'users',
        columns: [
            uuid('id'),
            varchar('email', 255),
            varchar('password_hash', undefined, true),
            varchar('full_name', 100, true),
            varchar('phone', 20, true),
            varchar('avatar_url', undefined, true),
            varchar('provider', 20, true),
            timestamp('created_at', true, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', true),
            timestamp('deleted_at', true),
            varchar('status', 20, true),
            boolean('is_verified', true, 'false'),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['email']],
    },
    {
        name: 'roles',
        columns: [
            uuid('id'),
            varchar('name', 50),
            text('description'),
            timestamp('created_at', true, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', true),
            timestamp('deleted_at', true),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['name']],
    },
    {
        name: 'permissions',
        columns: [
            uuid('id'),
            varchar('name', 100),
            varchar('resource', 50, true),
            varchar('action', 50, true),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['name']],
    },
    {
        name: 'user_roles',
        columns: [uuid('user_id'), uuid('role_id')],
        primaryKey: ['user_id', 'role_id'],
        foreignKeys: [fk(['user_id'], 'users', 'CASCADE'), fk(['role_id'], 'roles', 'CASCADE')],
    },
    {
        name: 'role_permissions',
        columns: [uuid('role_id'), uuid('permission_id')],
        primaryKey: ['role_id', 'permission_id'],
        foreignKeys: [
            fk(['role_id'], 'roles', 'CASCADE'),
            fk(['permission_id'], 'permissions', 'CASCADE'),
        ],
    },
    {
        name: 'artists',
        columns: [
            uuid('id'),
            varchar('stage_name', 255),
            varchar('slug', 255),
            text('bio'),
            varchar('avatar_url', undefined, true),
            jsonb('metadata'),
            varchar('status', 20, true),
            timestamp('deleted_at', true),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['slug']],
    },
    {
        name: 'categories',
        columns: [
            uuid('id'),
            varchar('name', 100),
            varchar('slug', 100, true),
            uuid('parent_id', true),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['slug']],
        foreignKeys: [fk(['parent_id'], 'categories', 'SET NULL')],
    },
    {
        name: 'products',
        columns: [
            uuid('id'),
            varchar('name', 255),
            varchar('slug', 255, true),
            text('description'),
            text('short_description'),
            uuid('category_id', true),
            varchar('product_type', 20),
            varchar('status', 20, true),
            decimal('min_price', 12, 2, true),
            jsonb('tracklist'),
            jsonb('media_gallery'),
            timestamp('deleted_at', true),
            timestamp('created_at', false, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['slug']],
        foreignKeys: [fk(['category_id'], 'categories', 'SET NULL')],
    },
    {
        name: 'product_artists',
        columns: [uuid('product_id'), uuid('artist_id')],
        primaryKey: ['product_id', 'artist_id'],
        foreignKeys: [
            fk(['product_id'], 'products', 'CASCADE'),
            fk(['artist_id'], 'artists', 'CASCADE'),
        ],
    },
    {
        name: 'product_variants',
        columns: [
            uuid('id'),
            uuid('product_id', true),
            varchar('sku', 50),
            varchar('name', 100),
            decimal('original_price', 15, 2),
            decimal('discount_percent', 15, 2, true),
            integer('stock_quantity', true, '0'),
            boolean('is_preorder', true, 'false'),
            timestamp('deleted_at', true),
            timestamp('created_at', false, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['sku']],
        foreignKeys: [fk(['product_id'], 'products', 'CASCADE')],
    },
    {
        name: 'variant_attributes',
        columns: [uuid('id'), uuid('variant_id'), varchar('key', 50), varchar('value', 100)],
        primaryKey: ['id'],
        foreignKeys: [fk(['variant_id'], 'product_variants', 'CASCADE')],
    },
    {
        name: 'carts',
        columns: [
            uuid('id'),
            uuid('user_id', true),
            timestamp('created_at', true, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['user_id']],
        foreignKeys: [fk(['user_id'], 'users', 'CASCADE')],
    },
    {
        name: 'cart_items',
        columns: [
            uuid('id'),
            uuid('cart_id', true),
            uuid('product_id', true),
            uuid('product_variant_id', true),
            integer('quantity', true, '1'),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['cart_id', 'product_id', 'product_variant_id']],
        foreignKeys: [
            fk(['cart_id'], 'carts', 'CASCADE'),
            fk(['product_id'], 'products', 'CASCADE'),
            fk(['product_variant_id'], 'product_variants', 'CASCADE'),
        ],
    },
    {
        name: 'orders',
        columns: [
            uuid('id'),
            uuid('user_id', true),
            varchar('email', 255, true),
            varchar('full_name', 100, true),
            varchar('phone', 20, true),
            varchar('status', 20, true),
            decimal('subtotal'),
            decimal('shipping_fee'),
            decimal('discount_amount', undefined, undefined, true),
            decimal('total_amount'),
            varchar('currency', 20, true),
            varchar('applied_voucher', undefined, true),
            jsonb('shipping_address', false),
            varchar('tracking_code', 50, true),
            text('note'),
            varchar('payment_method', 20, true),
            timestamp('created_at', true, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        foreignKeys: [fk(['user_id'], 'users', 'SET NULL')],
    },
    {
        name: 'order_items',
        columns: [
            uuid('id'),
            uuid('order_id', true),
            uuid('product_id', true),
            uuid('product_variant_id', true),
            varchar('product_name'),
            varchar('variant_name'),
            integer('quantity'),
            decimal('price'),
            decimal('original_price'),
            decimal('discount_percentage'),
            decimal('total_line_price'),
        ],
        primaryKey: ['id'],
        foreignKeys: [
            fk(['order_id'], 'orders', 'CASCADE'),
            fk(['product_id'], 'products', 'SET NULL'),
            fk(['product_variant_id'], 'product_variants', 'SET NULL'),
        ],
    },
    {
        name: 'discounts',
        columns: [
            uuid('id'),
            varchar('code', 50, true),
            text('description'),
            varchar('type', 20, true),
            decimal('value'),
            timestamp('start_date', true),
            timestamp('end_date', true),
            integer('usage_limit', true),
            integer('used_count', true, '0'),
            boolean('is_active', true, 'true'),
            varchar('applies_to', 20, true),
            timestamp('created_at', true, 'CURRENT_TIMESTAMP'),
            timestamp('updated_at', false),
            timestamp('deleted_at', true),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['code']],
    },
    {
        name: 'discount_usages',
        columns: [
            uuid('id'),
            uuid('discount_id', true),
            uuid('user_id', true),
            uuid('order_id', true),
            timestamp('used_at', true, 'CURRENT_TIMESTAMP'),
        ],
        primaryKey: ['id'],
        foreignKeys: [
            fk(['discount_id'], 'discounts', 'SET NULL'),
            fk(['user_id'], 'users', 'CASCADE'),
            fk(['order_id'], 'orders', 'CASCADE'),
        ],
    },
    {
        name: 'transactions',
        columns: [
            uuid('id'),
            uuid('order_id', true),
            varchar('type', undefined, true),
            varchar('provider', undefined, true),
            varchar('gateway_transaction_id', undefined, true),
            decimal('amount', undefined, undefined, true),
            varchar('status', undefined, true),
            jsonb('raw_response'),
            timestamp('created_at', true),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        foreignKeys: [fk(['order_id'], 'orders', 'CASCADE')],
    },
    {
        name: 'posts',
        columns: [
            uuid('id'),
            varchar('title', 255),
            varchar('slug', 255, true),
            text('content'),
            uuid('author_id', true),
            timestamp('published_at', true),
            boolean('is_pulished', true),
            timestamp('created_at', true),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        uniqueIndexes: [['slug']],
        foreignKeys: [fk(['author_id'], 'users', 'SET NULL')],
    },
    {
        name: 'audit_logs',
        columns: [
            uuid('id'),
            uuid('actor_id', true),
            varchar('action', 50),
            varchar('resource', 50),
            varchar('resource_id', undefined, true),
            jsonb('old_data'),
            jsonb('new_data'),
            varchar('ip_address', 45, true),
            text('user_agent'),
            timestamp('created_at', true),
            timestamp('updated_at', false),
        ],
        primaryKey: ['id'],
        foreignKeys: [fk(['actor_id'], 'users', 'SET NULL')],
    },
];
export const propertyColumnMappings: Record<string, Record<string, string>> = {
    users: {
        passwordHash: 'password_hash',
        fullName: 'full_name',
        avatarUrl: 'avatar_url',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        isVerified: 'is_verified',
    },
    products: {
        shortDescription: 'short_description',
        categoryId: 'category_id',
        productType: 'product_type',
        minPrice: 'min_price',
        mediaGallery: 'media_gallery',
        deletedAt: 'deleted_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
    posts: {
        authorId: 'author_id',
        publishedAt: 'published_at',
        isPublished: 'is_pulished',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
};

export const schemaDiscrepancies: SchemaDiscrepancyFixture[] = [
    {
        table: 'products',
        subject: 'timestamp precision',
        prisma: 'createdAt and updatedAt omit explicit precision',
        sql: 'created_at and updated_at use TIMESTAMP(3)',
        resolution: 'Preserve TIMESTAMP(3) from the authoritative migration.',
    },
    {
        table: 'users',
        subject: 'updated_at default',
        prisma: '@updatedAt is application-managed',
        sql: 'updated_at has no database default',
        resolution:
            'Treat the migration as authoritative; update semantics remain application-owned.',
    },
    {
        table: 'posts',
        subject: 'legacy column spelling',
        prisma: 'isPublished maps to is_pulished',
        sql: 'Physical column is is_pulished',
        resolution: 'Retain the legacy spelling in all future entity and migration metadata.',
    },
];
