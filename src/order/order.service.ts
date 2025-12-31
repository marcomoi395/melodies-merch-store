import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { DiscountType } from 'src/promotion/dto/create-promotion.dto';
import { OrderItemCreateManyInput, OrderWhereInput } from 'generated/prisma/models';
import { Decimal } from '@prisma/client/runtime/client';
import { GetOrdersDto } from './dto/get-order.dto';

@Injectable()
export class OrderService {
    constructor(private prisma: PrismaService) {}

    async getOrdersByUserId(userId: string, query: GetOrdersDto) {
        const { page = 1, limit = 20, sort, startDate, endDate, status } = query;

        const where: OrderWhereInput = { userId };

        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        let orderBy: any = { createdAt: 'desc' };

        if (sort) {
            const [field, direction] = sort.split(':');
            if (field && ['asc', 'desc'].includes(direction)) {
                orderBy = { [field]: direction };
            }
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: { orderItems: true },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getOrderById(orderId: string) {
        return await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
        });
    }

    async previewOrder(payload: CreateOrderDto) {
        const { items, appliedVoucher, ...restData } = payload;

        const productVariantIds = items.map((i) => i.productVariantId);
        const productVariants = await this.prisma.productVariant.findMany({
            where: {
                id: { in: productVariantIds },
                deletedAt: null,
            },
            include: {
                product: true,
            },
        });

        if (productVariants.length !== items.length) {
            throw new BadRequestException('One or more product variants are invalid');
        }

        let subtotal = new Decimal(0);
        const orderItemsPreview: OrderItemCreateManyInput[] = [];

        for (const item of items) {
            const productVariant = productVariants.find((p) => p.id === item.productVariantId);

            if (!productVariant) {
                throw new BadRequestException(
                    'Invalid product variant ID: ' + item.productVariantId,
                );
            }

            if ((productVariant.stockQuantity ?? 0) < item.quantity) {
                throw new BadRequestException(
                    `Sản phẩm ${productVariant.name} chỉ còn lại ${productVariant.stockQuantity}, không đủ số lượng yêu cầu.`,
                );
            }

            const originalPrice = new Decimal(productVariant.originalPrice);
            const discountPercent = new Decimal(productVariant.discountPercent || 0);

            // Price = Original * (1 - Percent/100)
            const itemPrice = originalPrice.mul(new Decimal(100).minus(discountPercent).div(100));
            const lineTotal = itemPrice.mul(item.quantity);

            subtotal = subtotal.plus(lineTotal);

            if (!productVariant.product) {
                throw new BadRequestException(
                    `Data integrity error: Variant ${productVariant.id} has no parent Product.`,
                );
            }

            const orderItem = {
                productId: productVariant.productId,
                productVariantId: productVariant.id,
                productName: productVariant.product.name,
                variantName: productVariant.name,
                quantity: item.quantity,
                price: new Decimal(itemPrice),
                originalPrice: productVariant.originalPrice,
                discountPercentage: productVariant.discountPercent || 0,
                totalLinePrice: lineTotal,
            };

            orderItemsPreview.push(orderItem);
        }

        let discountAmount = new Decimal(0);

        if (appliedVoucher) {
            const code = await this.prisma.discount.findUnique({
                where: { code: appliedVoucher, isActive: true },
            });

            if (!code) {
                throw new BadRequestException('Invalid voucher code');
            }

            const now = new Date();
            if (
                code?.startDate &&
                code?.endDate &&
                (now < code?.startDate || now > code?.endDate)
            ) {
                throw new BadRequestException('Voucher code is not valid at this time');
            }

            if (
                code.usageLimit !== null &&
                code.usedCount !== null &&
                code.usedCount >= code.usageLimit
            ) {
                throw new BadRequestException('Voucher code usage limit has been reached');
            }

            const voucherValue = new Decimal(code.value);

            if (code.type === DiscountType.FIXED) {
                discountAmount = voucherValue;
            } else if (code.type === DiscountType.PERCENTAGE) {
                discountAmount = subtotal.mul(voucherValue.div(100));
            }

            if (discountAmount.greaterThan(subtotal)) {
                discountAmount = subtotal;
            }
        }

        const total = subtotal.minus(discountAmount);

        return {
            email: restData.email,
            fullName: restData.fullName,
            phone: restData.phone,
            subtotal,
            shippingFee: 0,
            discountAmount,
            totalAmount: total,
            appliedVoucher: appliedVoucher || null,
            orderItems: orderItemsPreview,
        };
    }

    async createOrder(payload: CreateOrderDto, userId: string | null = null) {
        const { items, appliedVoucher, ...restData } = payload;
        const productVariantIds = items.map((i) => i.productVariantId);
        const productVariants = await this.prisma.productVariant.findMany({
            where: {
                id: { in: productVariantIds },
                deletedAt: null,
            },
            include: {
                product: true,
            },
        });

        if (productVariants.length !== items.length) {
            throw new BadRequestException('One or more product variants are invalid');
        }

        let subtotal = new Decimal(0);
        const orderItemsData: OrderItemCreateManyInput[] = [];
        const updateStockData: { productVariantId: string; quantity: number }[] = [];

        for (const item of items) {
            const productVariant = productVariants.find((p) => p.id === item.productVariantId);

            if (!productVariant) {
                throw new BadRequestException(
                    'Invalid product variant ID: ' + item.productVariantId,
                );
            }

            if ((productVariant.stockQuantity ?? 0) < item.quantity) {
                throw new BadRequestException(
                    'Insufficient stock for product variant ID: ' + item.productVariantId,
                );
            }

            const originalPrice = new Decimal(productVariant.originalPrice);
            const discountPercent = new Decimal(productVariant.discountPercent || 0);

            // Price = Original * (1 - Percent/100)
            const itemPrice = originalPrice.mul(new Decimal(100).minus(discountPercent).div(100));
            const lineTotal = itemPrice.mul(item.quantity);

            subtotal = subtotal.plus(lineTotal);

            if (!productVariant.product) {
                throw new BadRequestException(
                    `Data integrity error: Variant ${productVariant.id} has no parent Product.`,
                );
            }

            const orderItem = {
                productId: productVariant.productId,
                productVariantId: productVariant.id,
                productName: productVariant.product.name,
                variantName: productVariant.name,
                quantity: item.quantity,
                price: new Decimal(itemPrice),
                originalPrice: productVariant.originalPrice,
                discountPercentage: productVariant.discountPercent || 0,
                totalLinePrice: lineTotal,
            };

            orderItemsData.push(orderItem);
            updateStockData.push({
                productVariantId: productVariant.id,
                quantity: item.quantity,
            });
        }

        let discountAmount = new Decimal(0);

        if (appliedVoucher) {
            const code = await this.prisma.discount.findUnique({
                where: { code: appliedVoucher, isActive: true },
            });

            if (!code) {
                throw new BadRequestException('Invalid voucher code');
            }

            const now = new Date();
            if (
                code?.startDate &&
                code?.endDate &&
                (now < code?.startDate || now > code?.endDate)
            ) {
                throw new BadRequestException('Voucher code is not valid at this time');
            }

            if (
                code.usageLimit !== null &&
                code.usedCount !== null &&
                code.usedCount >= code.usageLimit
            ) {
                throw new BadRequestException('Voucher code usage limit has been reached');
            }

            const voucherValue = new Decimal(code.value);

            if (code.type === DiscountType.FIXED) {
                discountAmount = voucherValue;
            } else if (code.type === DiscountType.PERCENTAGE) {
                discountAmount = subtotal.mul(voucherValue.div(100));
            }

            if (discountAmount.greaterThan(subtotal)) {
                discountAmount = subtotal;
            }
        }

        const total = subtotal.minus(discountAmount);

        return await this.prisma.$transaction(async (tx) => {
            // Update stock quantities
            await Promise.all(
                updateStockData.map((item) =>
                    tx.productVariant.update({
                        where: { id: item.productVariantId },
                        data: {
                            stockQuantity: {
                                decrement: item.quantity,
                            },
                        },
                    }),
                ),
            );

            // Update voucher usage count
            if (appliedVoucher) {
                await tx.discount.update({
                    where: { code: appliedVoucher },
                    data: { usedCount: { increment: 1 } },
                });
            }

            // Create order
            return await tx.order.create({
                data: {
                    userId: userId || null,
                    email: restData.email,
                    fullName: restData.fullName,
                    phone: restData.phone,
                    subtotal,
                    shippingFee: 0,
                    discountAmount,
                    totalAmount: total,
                    appliedVoucher: appliedVoucher || null,
                    shippingAddress: restData.shippingAddress,
                    paymentMethod: restData.paymentMethod,
                    orderItems: {
                        create: orderItemsData,
                    },
                    note: restData.note || null,
                },
                include: { orderItems: true },
            });
        });
    }

    async cancelOrder(orderId: string, userId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId, userId },
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Only pending orders can be cancelled');
        }

        return await this.prisma.order.update({
            where: { id: orderId, userId },
            data: {
                status: 'CANCELLED',
            },
        });
    }

    async getOrdersForAdmin(query: GetOrdersDto) {
        const { page = 1, limit = 20, sort, startDate, endDate, status } = query;

        const where: OrderWhereInput = {};

        if (status) {
            where.status = status;
        }
        // Lọc theo khoảng thời gian
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        let orderBy: any = { createdAt: 'desc' };

        if (sort) {
            const [field, direction] = sort.split(':');
            if (field && ['asc', 'desc'].includes(direction)) {
                orderBy = { [field]: direction };
            }
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: { orderItems: true },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getOrderDetailForAdmin(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        return order;
    }

    async changeOrderStatusForAdmin(orderId: string, status: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        if (order.status === status) {
            throw new BadRequestException('Order is already in the desired status');
        }

        return await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status,
            },
        });
    }
}
