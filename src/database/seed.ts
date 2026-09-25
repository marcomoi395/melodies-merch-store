import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as bcrypt from 'bcryptjs';
import { EntityManager } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { AppDataSource } from './data-source';
import { ArtistEntity } from './entities/artist.entity';
import { CartEntity } from './entities/cart.entity';
import { CartItemEntity } from './entities/cart-item.entity';
import { CategoryEntity } from './entities/category.entity';
import { DiscountEntity } from './entities/discount.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PermissionEntity } from './entities/permission.entity';
import { ProductArtistEntity } from './entities/product-artist.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { RoleEntity } from './entities/role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { UserEntity } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { VariantAttributeEntity } from './entities/variant-attribute.entity';

const ORDER_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

const permissions = [
    ['PRODUCT_VIEW', 'PRODUCT', 'VIEW'],
    ['PRODUCT_CREATE', 'PRODUCT', 'CREATE'],
    ['PRODUCT_UPDATE', 'PRODUCT', 'UPDATE'],
    ['PRODUCT_DELETE', 'PRODUCT', 'DELETE'],
    ['CATEGORY_MANAGE', 'CATEGORY', 'MANAGE'],
    ['BRAND_MANAGE', 'BRAND', 'MANAGE'],
    ['ORDER_VIEW', 'ORDER', 'VIEW'],
    ['ORDER_UPDATE_STATUS', 'ORDER', 'UPDATE_STATUS'],
    ['ORDER_EXPORT', 'ORDER', 'EXPORT'],
    ['PROMOTION_MANAGE', 'PROMOTION', 'MANAGE'],
    ['CONTENT_MANAGE', 'CONTENT', 'MANAGE'],
    ['CUSTOMER_VIEW', 'CUSTOMER', 'VIEW'],
    ['CUSTOMER_BAN', 'CUSTOMER', 'BAN'],
    ['STAFF_MANAGE', 'SYSTEM', 'MANAGE_STAFF'],
    ['ROLE_MANAGE', 'SYSTEM', 'MANAGE_ROLE'],
    ['REPORT_VIEW_REVENUE', 'REPORT', 'VIEW_REVENUE'],
    ['REPORT_VIEW_GENERAL', 'REPORT', 'VIEW_GENERAL'],
] as const;

interface SeedData {
    categories: Array<{
        name: string;
        slug: string;
        children?: Array<{ name: string; slug: string }>;
    }>;
    discounts: Array<{
        code: string;
        description: string;
        type: string;
        value: number;
        usageLimit: number;
        startDate: string;
        endDate: string;
    }>;
    artists: Array<{
        stageName: string;
        slug: string;
        bio: string;
        status: string;
        avatarUrl: string;
        products: Array<{
            name: string;
            slug: string;
            description: string;
            productType: string;
            status: string;
            minPrice: number;
            categorySlug: string;
            mediaGallery?: unknown;
            variants: Array<{
                sku: string;
                name: string;
                originalPrice: number;
                stockQuantity: number;
                attributes: Array<{ key: string; value: string }>;
            }>;
        }>;
    }>;
    carts: Array<{
        userEmail: string;
        items: Array<{ productSlug: string; variantSku?: string; quantity?: number }>;
    }>;
    orders: Array<{
        userEmail: string;
        status?: string;
        paymentMethod?: string;
        shippingAddress: Record<string, unknown> & { phone?: string };
        discountCode?: string | null;
        note?: string | null;
        items: Array<{ productSlug: string; variantSku?: string; quantity: number }>;
        transactions?: Array<{
            type?: string;
            provider?: string;
            gatewayTransactionId?: string;
            status?: string;
            amount?: number;
            rawResponse?: Record<string, unknown>;
        }>;
    }>;
}

async function readSeedData(): Promise<SeedData> {
    const source = await readFile(path.join(__dirname, 'seed.json'), 'utf8');
    return JSON.parse(source) as SeedData;
}

async function seedIdentity(manager: EntityManager): Promise<void> {
    const permissionRepository = manager.getRepository(PermissionEntity);
    await permissionRepository.upsert(
        permissions.map(([name, resource, action]) => ({ name, resource, action })),
        ['name'],
    );

    const allPermissions = await permissionRepository.find();
    const roleRepository = manager.getRepository(RoleEntity);
    let superAdmin = await roleRepository.findOneBy({ name: 'SUPER_ADMIN' });
    if (!superAdmin) {
        superAdmin = await roleRepository.save({
            name: 'SUPER_ADMIN',
            description: 'System Administrator with full access',
        });
    }

    const rolePermissionRepository = manager.getRepository(RolePermissionEntity);
    await rolePermissionRepository.delete({ roleId: superAdmin.id });
    await rolePermissionRepository.save(
        allPermissions.map((permission) => ({
            roleId: superAdmin.id,
            permissionId: permission.id,
        })),
    );

    const passwordHash = await bcrypt.hash('123456', 10);
    const userRepository = manager.getRepository(UserEntity);
    await userRepository.upsert(
        [
            {
                email: 'admin@gmail.com',
                passwordHash,
                fullName: 'Thanh Loi',
                phone: '0909123456',
                status: 'active',
                isVerified: true,
            },
            {
                email: 'client@gmail.com',
                passwordHash,
                fullName: 'Nguyễn Văn Mua',
                phone: '0987654321',
                status: 'active',
                isVerified: true,
            },
        ],
        ['email'],
    );

    const admin = await userRepository.findOneByOrFail({ email: 'admin@gmail.com' });
    const userRoleRepository = manager.getRepository(UserRoleEntity);
    await userRoleRepository.upsert({ userId: admin.id, roleId: superAdmin.id }, [
        'userId',
        'roleId',
    ]);
}

async function seedCatalog(manager: EntityManager, data: SeedData): Promise<void> {
    const updatedAt = new Date();
    const categoryRepository = manager.getRepository(CategoryEntity);
    for (const category of data.categories) {
        await categoryRepository.upsert({ name: category.name, slug: category.slug }, ['slug']);
        const parent = await categoryRepository.findOneByOrFail({ slug: category.slug });
        for (const child of category.children ?? []) {
            await categoryRepository.upsert(
                { name: child.name, slug: child.slug, parentId: parent.id },
                ['slug'],
            );
        }
    }

    await manager.getRepository(DiscountEntity).upsert(
        data.discounts.map((discount) => ({
            ...discount,
            value: String(discount.value),
            startDate: new Date(discount.startDate),
            endDate: new Date(discount.endDate),
            isActive: true,
            updatedAt: new Date(),
        })),
        ['code'],
    );

    const artistRepository = manager.getRepository(ArtistEntity);
    const productRepository = manager.getRepository(ProductEntity);
    const variantRepository = manager.getRepository(ProductVariantEntity);
    const productArtistRepository = manager.getRepository(ProductArtistEntity);
    const attributeRepository = manager.getRepository(VariantAttributeEntity);

    for (const artistData of data.artists) {
        await artistRepository.upsert(
            {
                stageName: artistData.stageName,
                slug: artistData.slug,
                bio: artistData.bio,
                status: artistData.status,
                avatarUrl: artistData.avatarUrl,
            },
            ['slug'],
        );
        const artist = await artistRepository.findOneByOrFail({ slug: artistData.slug });

        for (const productData of artistData.products) {
            const category = await categoryRepository.findOneBy({ slug: productData.categorySlug });
            if (!category) {
                throw new Error(
                    `Missing category ${productData.categorySlug} for ${productData.slug}`,
                );
            }

            await productRepository.upsert(
                {
                    name: productData.name,
                    slug: productData.slug,
                    description: productData.description,
                    productType: productData.productType,
                    status: productData.status,
                    minPrice: String(productData.minPrice),
                    mediaGallery: productData.mediaGallery ?? [],
                    categoryId: category.id,
                    updatedAt,
                },
                ['slug'],
            );
            const product = await productRepository.findOneByOrFail({ slug: productData.slug });
            await productArtistRepository.upsert({ productId: product.id, artistId: artist.id }, [
                'productId',
                'artistId',
            ]);

            for (const variantData of productData.variants) {
                await variantRepository.upsert(
                    {
                        productId: product.id,
                        sku: variantData.sku,
                        name: variantData.name,
                        originalPrice: String(variantData.originalPrice),
                        stockQuantity: variantData.stockQuantity,
                        updatedAt,
                    },
                    ['sku'],
                );
                const variant = await variantRepository.findOneByOrFail({ sku: variantData.sku });
                await attributeRepository.delete({ variantId: variant.id });
                await attributeRepository.save(
                    variantData.attributes.map((attribute) => ({
                        variantId: variant.id,
                        key: attribute.key,
                        value: attribute.value,
                    })),
                );
            }
        }
    }
}

async function findProductAndVariant(
    manager: EntityManager,
    productSlug: string,
    variantSku?: string,
): Promise<{ product: ProductEntity; variant: ProductVariantEntity } | undefined> {
    const product = await manager.getRepository(ProductEntity).findOneBy({ slug: productSlug });
    if (!product) {
        return undefined;
    }
    const variantRepository = manager.getRepository(ProductVariantEntity);
    const variant = variantSku
        ? await variantRepository.findOneBy({ sku: variantSku })
        : await variantRepository.findOneBy({ productId: product.id });
    return variant ? { product, variant } : undefined;
}

async function seedCarts(manager: EntityManager, data: SeedData): Promise<void> {
    const userRepository = manager.getRepository(UserEntity);
    const cartRepository = manager.getRepository(CartEntity);
    const cartItemRepository = manager.getRepository(CartItemEntity);

    for (const cartData of data.carts) {
        const user = await userRepository.findOneBy({ email: cartData.userEmail });
        if (!user) {
            throw new Error(`Missing user ${cartData.userEmail}`);
        }
        let cart = await cartRepository.findOneBy({ userId: user.id });
        if (!cart) {
            cart = await cartRepository.save({ userId: user.id });
        }
        await cartItemRepository.delete({ cartId: cart.id });

        for (const item of cartData.items) {
            const productAndVariant = await findProductAndVariant(
                manager,
                item.productSlug,
                item.variantSku,
            );
            if (!productAndVariant) {
                throw new Error(`Missing cart item ${item.productSlug}`);
            }
            await cartItemRepository.save({
                cartId: cart.id,
                productId: productAndVariant.product.id,
                productVariantId: productAndVariant.variant.id,
                quantity: item.quantity ?? 1,
            });
        }
    }
}

async function seedOrders(manager: EntityManager, data: SeedData): Promise<void> {
    const userRepository = manager.getRepository(UserEntity);
    const discountRepository = manager.getRepository(DiscountEntity);
    const orderRepository = manager.getRepository(OrderEntity);
    const orderItemRepository = manager.getRepository(OrderItemEntity);
    const transactionRepository = manager.getRepository(TransactionEntity);

    for (const [index, orderData] of data.orders.entries()) {
        const user = await userRepository.findOneBy({ email: orderData.userEmail });
        if (!user) {
            throw new Error(`Missing user ${orderData.userEmail}`);
        }

        const items: Array<Partial<OrderItemEntity>> = [];
        let subtotal = 0;
        for (const item of orderData.items) {
            const productAndVariant = await findProductAndVariant(
                manager,
                item.productSlug,
                item.variantSku,
            );
            if (!productAndVariant) {
                throw new Error(`Missing order item ${item.productSlug}`);
            }
            const price = Number(productAndVariant.variant.originalPrice);
            const total = price * item.quantity;
            subtotal += total;
            items.push({
                productId: productAndVariant.product.id,
                productVariantId: productAndVariant.variant.id,
                productName: productAndVariant.product.name,
                variantName: productAndVariant.variant.name,
                quantity: item.quantity,
                price: String(price),
                originalPrice: String(price),
                discountPercentage: '0',
                totalLinePrice: String(total),
            });
        }

        const discount = orderData.discountCode
            ? await discountRepository.findOneBy({ code: orderData.discountCode })
            : null;
        const discountAmount =
            discount?.isActive && discount.type?.toLowerCase() === 'percentage'
                ? (subtotal * Number(discount.value)) / 100
                : discount?.isActive
                  ? Number(discount.value)
                  : 0;
        const shippingFee = 30000;
        const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);
        const id = uuidv5(`melodies-seed-order:${orderData.userEmail}:${index}`, ORDER_NAMESPACE);

        await orderRepository.upsert(
            {
                id,
                userId: user.id,
                email: user.email,
                fullName: user.fullName,
                phone: orderData.shippingAddress.phone ?? user.phone,
                status: orderData.status ?? 'PENDING',
                paymentMethod: orderData.paymentMethod ?? 'COD',
                shippingAddress: orderData.shippingAddress as any,
                note: orderData.note ?? null,
                subtotal: String(subtotal),
                shippingFee: String(shippingFee),
                discountAmount: String(discountAmount),
                totalAmount: String(totalAmount),
                currency: 'VND',
                appliedVoucher: discount?.isActive ? discount.code : '',
                updatedAt: new Date(),
            },
            ['id'],
        );
        await orderItemRepository.delete({ orderId: id });
        await transactionRepository.delete({ orderId: id });
        await orderItemRepository.save(items.map((item) => ({ ...item, orderId: id })));
        await transactionRepository.save(
            (orderData.transactions ?? []).map((transaction) => ({
                orderId: id,
                type: transaction.type ?? null,
                provider: transaction.provider ?? null,
                gatewayTransactionId: transaction.gatewayTransactionId ?? null,
                status: transaction.status ?? null,
                amount: String(
                    transaction.type === 'PAYMENT' ? totalAmount : (transaction.amount ?? 0),
                ),
                rawResponse: transaction.rawResponse ?? {},
            })),
        );
    }
}

async function main(): Promise<void> {
    await AppDataSource.initialize();
    try {
        const data = await readSeedData();
        await AppDataSource.transaction(async (manager) => {
            await seedIdentity(manager);
            await seedCatalog(manager, data);
            await seedCarts(manager, data);
            await seedOrders(manager, data);
        });
    } finally {
        await AppDataSource.destroy();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
