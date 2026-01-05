/* eslint-disable */
import { PrismaClient } from 'generated/prisma/client';
import * as bcrypt from 'bcryptjs';
import { PERMISSIONS_METADATA } from 'src/permissions/permissions';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { readFile } from 'fs/promises';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    await cleanDatabase();

    await syncPermissions();
    const superAdminRole = await syncSuperAdminRole();
    await seedIamAndUsers(superAdminRole.id);
    await seed();
}

async function cleanDatabase() {
    const deleteTables = [
        prisma.auditLog.deleteMany(),
        prisma.transaction.deleteMany(),
        prisma.discountUsage.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.cartItem.deleteMany(),
        prisma.variantAttribute.deleteMany(),
        prisma.productVariant.deleteMany(),
        prisma.productArtist.deleteMany(),
        prisma.rolePermission.deleteMany(),
        prisma.userRole.deleteMany(),
    ];
    await prisma.$transaction(deleteTables);

    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.post.deleteMany();
    await prisma.product.deleteMany();
    await prisma.artist.deleteMany();
    await prisma.category.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
}

async function syncPermissions() {
    for (const permission of PERMISSIONS_METADATA) {
        await prisma.permission.upsert({
            where: {
                name: permission.name,
            },
            update: {
                resource: permission.resource,
                action: permission.action,
            },
            create: {
                name: permission.name,
                resource: permission.resource,
                action: permission.action,
            },
        });
    }
}
async function syncSuperAdminRole() {
    const allPermissions = await getPermisisons();

    return await prisma.role.upsert({
        where: {
            name: 'SUPER_ADMIN',
        },
        update: {
            rolePermissions: {
                deleteMany: {},
                create: allPermissions.map((permission) => ({
                    permission: {
                        connect: { id: permission.id },
                    },
                })),
            },
        },
        create: {
            name: 'SUPER_ADMIN',
            description: 'System Administrator with full access',
            rolePermissions: {
                create: allPermissions.map((permission) => ({
                    permission: {
                        connect: { id: permission.id },
                    },
                })),
            },
        },
    });
}

async function getPermisisons() {
    const permissions = await prisma.permission.findMany({
        orderBy: {
            resource: 'asc',
        },
    });

    return permissions;
}

async function seedIamAndUsers(superAdminRoleId: string) {
    const passwordHash = await bcrypt.hash('123456', 10);

    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@gmail.com',
            passwordHash,
            fullName: 'Thanh Loi',
            phone: '0909123456',
            status: 'active',
            isVerified: true,
            userRoles: { create: { roleId: superAdminRoleId } },
        },
    });

    const customerUser = await prisma.user.create({
        data: {
            email: 'client@gmail.com',
            passwordHash,
            fullName: 'Nguyễn Văn Mua',
            phone: '0987654321',
            status: 'active',
            isVerified: true,
        },
    });
}

async function seed() {
    const jsonString = await readFile('./prisma/seed.json', 'utf8');
    const data = JSON.parse(jsonString);
    for (const cat of data.categories) {
        const parent = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: {
                name: cat.name,
                slug: cat.slug,
            },
        });

        if (cat.children && cat.children.length > 0) {
            for (const child of cat.children) {
                await prisma.category.upsert({
                    where: { slug: child.slug },
                    update: { parentId: parent.id },
                    create: {
                        name: child.name,
                        slug: child.slug,
                        parentId: parent.id,
                    },
                });
            }
        }
    }

    for (const dis of data.discounts) {
        await prisma.discount.upsert({
            where: { code: dis.code },
            update: {},
            create: {
                code: dis.code,
                description: dis.description,
                type: dis.type,
                value: dis.value,
                usageLimit: dis.usageLimit,
                startDate: new Date(dis.startDate),
                endDate: new Date(dis.endDate),
                isActive: true,
            },
        });
    }

    for (const artistData of data.artists) {
        const artist = await prisma.artist.upsert({
            where: { slug: artistData.slug },
            update: {},
            create: {
                stageName: artistData.stageName,
                slug: artistData.slug,
                bio: artistData.bio,
                status: artistData.status,
                avatarUrl: artistData.avatarUrl,
            },
        });

        for (const prod of artistData.products) {
            const category = await prisma.category.findUnique({
                where: { slug: prod.categorySlug },
            });

            if (!category) {
                console.warn(
                    `Cảnh báo: Không tìm thấy category slug "${prod.categorySlug}" cho sản phẩm "${prod.name}"`,
                );
                continue;
            }

            // Tạo Product
            const product = await prisma.product.create({
                data: {
                    name: prod.name,
                    slug: prod.slug,
                    description: prod.description,
                    productType: prod.productType,
                    status: prod.status,
                    minPrice: prod.minPrice,
                    mediaGallery: prod.mediaGallery ?? [], // JSONB
                    categoryId: category.id,
                    productArtists: {
                        create: {
                            artistId: artist.id,
                        },
                    },
                    productVariants: {
                        create: prod.variants.map((variant) => ({
                            sku: variant.sku,
                            name: variant.name,
                            originalPrice: variant.originalPrice,
                            stockQuantity: variant.stockQuantity,
                            attributes: {
                                create: variant.attributes.map((attr) => ({
                                    key: attr.key,
                                    value: attr.value,
                                })),
                            },
                        })),
                    },
                },
            });
        }
    }

    for (const cart of data.carts) {
        const user = await prisma.user.findUnique({
            where: { email: cart.userEmail },
        });

        if (!user) {
            console.warn(`⚠️ Bỏ qua Cart: Không tìm thấy user email ${cart.userEmail}`);
            continue;
        }

        const cartItemsData: object[] = [];

        for (const item of cart.items) {
            // Tìm Product
            const product = await prisma.product.findUnique({
                where: { slug: item.productSlug },
                include: { productVariants: true },
            });

            if (!product) {
                console.warn(`⚠️ Cart Item: Không tìm thấy sản phẩm slug "${item.productSlug}"`);
                continue;
            }

            const variant =
                product.productVariants.find((v) => v.sku === item.variantSku) ||
                product.productVariants[0];

            if (variant) {
                cartItemsData.push({
                    productId: product.id,
                    productVariantId: variant.id,
                    quantity: item.quantity || 1,
                });
            }
        }

        if (cartItemsData.length > 0) {
            await prisma.cart.create({
                data: {
                    userId: user.id,
                    cartItems: {
                        create: cartItemsData,
                    },
                },
            });
        }
    }

    for (const order of data.orders) {
        const user = await prisma.user.findUnique({
            where: { email: order.userEmail },
        });

        if (!user) {
            console.warn(`⚠️ Bỏ qua Order: Không tìm thấy user email ${order.userEmail}`);
            continue;
        }

        let subtotal = 0;
        const orderItemsData: any = [];

        for (const item of order.items) {
            const product = await prisma.product.findUnique({
                where: { slug: item.productSlug },
                include: { productVariants: true },
            });

            if (!product) {
                console.warn(`⚠️ Order Item: Không tìm thấy sản phẩm ${item.productSlug}`);
                continue;
            }

            const variant =
                product.productVariants.find((v) => v.sku === item.variantSku) ||
                product.productVariants[0];

            if (variant) {
                const price = Number(variant.originalPrice);
                const lineTotal = price * item.quantity;
                subtotal += lineTotal;

                orderItemsData.push({
                    productId: product.id,
                    productVariantId: variant.id,
                    productName: product.name,
                    variantName: variant.name,
                    quantity: item.quantity,
                    price: price,
                    originalPrice: Number(variant.originalPrice),
                    discountPercentage: 0,
                    totalLinePrice: lineTotal,
                });
            }
        }

        if (orderItemsData.length === 0) continue;

        const shippingFee = 30000;
        let discountAmount = 0;
        let appliedVoucher = '';

        if (order.discountCode) {
            const discount = await prisma.discount.findUnique({
                where: { code: order.discountCode },
            });

            if (discount && discount.isActive) {
                appliedVoucher = discount.code || '';
                if (discount.type === 'PERCENTAGE') {
                    discountAmount = (subtotal * Number(discount.value)) / 100;
                } else {
                    discountAmount = Number(discount.value);
                }
            }
        }

        const totalAmount = subtotal + shippingFee - discountAmount;
        const finalAmount = totalAmount > 0 ? totalAmount : 0;

        // 4. CHUẨN BỊ TRANSACTION DATA (Phần quan trọng nhất nè)
        const transactionsCreate = (order.transactions || []).map((trans: any) => {
            let amountToRecord = trans.amount;

            if (trans.type === 'PAYMENT') {
                amountToRecord = finalAmount;
            }

            return {
                type: trans.type,
                provider: trans.provider,
                gatewayTransactionId: trans.gatewayTransactionId,
                status: trans.status,
                amount: amountToRecord,
                rawResponse: trans.rawResponse ?? {},
            };
        });

        await prisma.order.create({
            data: {
                userId: user.id,
                email: user.email,
                fullName: user.fullName,
                phone: order.shippingAddress.phone || user.phone,
                status: order.status || 'PENDING',
                paymentMethod: order.paymentMethod || 'COD',
                shippingAddress: order.shippingAddress,
                note: order.note || null,
                subtotal: subtotal,
                shippingFee: shippingFee,
                discountAmount: discountAmount,
                totalAmount: finalAmount,
                currency: 'VND',
                appliedVoucher: appliedVoucher,
                orderItems: {
                    create: orderItemsData,
                },
                transactions: {
                    create: transactionsCreate,
                },
            },
        });
    }
}

main()
    .catch((e) => {
        console.error('[1]:: Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
