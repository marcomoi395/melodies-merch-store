import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DiscountEntity } from 'src/database/entities/discount.entity';
import { OrderItemEntity } from 'src/database/entities/order-item.entity';
import { OrderEntity } from 'src/database/entities/order.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { DiscountType } from 'src/promotion/dto/create-promotion.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersDto } from './dto/get-order.dto';
import { PreviewOrderDto } from './dto/preview.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';

type OrderInput = CreateOrderDto | PreviewOrderDto;

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(OrderEntity) private orders: Repository<OrderEntity>,
        @InjectRepository(ProductVariantEntity) private variants: Repository<ProductVariantEntity>,
        @InjectRepository(DiscountEntity) private discounts: Repository<DiscountEntity>,
        private dataSource: DataSource,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) {}

    private async orderData(payload: OrderInput) {
        const { items, appliedVoucher, ...rest } = payload;
        const ids = items.map((item) => item.productVariantId);
        const variants = await this.variants.find({
            where: { id: In(ids), deletedAt: IsNull(), product: { status: 'published' } },
            relations: { product: true },
        });
        if (variants.length !== items.length) {
            throw new BadRequestException('One or more product variants are invalid');
        }
        let subtotal = 0;
        const orderItems: Partial<OrderItemEntity>[] = [];
        const stock: { id: string; quantity: number }[] = [];
        for (const item of items) {
            const variant = variants.find((candidate) => candidate.id === item.productVariantId);
            if (!variant || !variant.product) {
                throw new BadRequestException(
                    'Invalid product variant ID: ' + item.productVariantId,
                );
            }
            if ((variant.stockQuantity ?? 0) < item.quantity) {
                throw new BadRequestException(
                    `Insufficient stock for product variant ID: ${item.productVariantId}`,
                );
            }
            const originalPrice = Number(variant.originalPrice);
            const discountPercent = Number(variant.discountPercent ?? 0);
            const price = originalPrice * (1 - discountPercent / 100);
            const totalLinePrice = price * item.quantity;
            subtotal += totalLinePrice;
            orderItems.push({
                productId: variant.productId,
                productVariantId: variant.id,
                productName: variant.product.name,
                variantName: variant.name,
                quantity: item.quantity,
                price: String(price),
                originalPrice: variant.originalPrice,
                discountPercentage: String(discountPercent),
                totalLinePrice: String(totalLinePrice),
            });
            stock.push({ id: variant.id, quantity: item.quantity });
        }
        let discountAmount = 0;
        if (appliedVoucher) {
            const discount = await this.discounts.findOneBy({
                code: appliedVoucher,
                isActive: true,
            });
            if (!discount) {
                throw new BadRequestException('Invalid voucher code');
            }
            discountAmount = this.calculateDiscount(discount, subtotal);
        }
        return {
            ...rest,
            appliedVoucher: appliedVoucher ?? null,
            subtotal,
            discountAmount,
            totalAmount: subtotal - discountAmount,
            orderItems,
            stock,
        };
    }

    private orderQuery(query: GetOrdersDto, userId?: string) {
        const { status, startDate, endDate } = query;
        const where = this.orders.createQueryBuilder('order');
        if (userId) {
            where.where('order.userId = :userId', { userId });
        }
        if (status) {
            where.andWhere('order.status = :status', { status });
        }
        if (startDate) {
            where.andWhere('order.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            where.andWhere('order.createdAt <= :endDate', { endDate });
        }
        return where;
    }

    private async listOrders(query: GetOrdersDto, userId?: string) {
        const { page = 1, limit = 20 } = query;
        const [orders, total] = await Promise.all([
            this.orderQuery(query, userId)
                .leftJoinAndSelect('order.orderItems', 'orderItems')
                .take(limit)
                .skip((page - 1) * limit)
                .getMany(),
            this.orderQuery(query, userId).getCount(),
        ]);
        return { data: orders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getOrdersByUserId(userId: string, query: GetOrdersDto) {
        return this.listOrders(query, userId);
    }
    async getOrdersForAdmin(query: GetOrdersDto) {
        return this.listOrders(query);
    }

    async getOrderById(orderId: string, userId?: string) {
        return this.orders.findOne({
            where: userId ? { id: orderId, userId } : { id: orderId },
            relations: { orderItems: true },
        });
    }

    async previewOrder(payload: PreviewOrderDto) {
        const data = await this.orderData(payload);
        return {
            subtotal: data.subtotal,
            shippingFee: 0,
            discountAmount: data.discountAmount,
            totalAmount: data.totalAmount,
            appliedVoucher: data.appliedVoucher,
            shippingAddress: data.shippingAddress,
            orderItems: data.orderItems,
        };
    }

    async trackGuestOrders(payload: TrackOrderDto) {
        if ((payload.email ? 1 : 0) + (payload.phone ? 1 : 0) !== 1) {
            throw new BadRequestException('Provide exactly one email or phone');
        }

        const identifier = payload.email
            ? `email:${payload.email.trim().toLowerCase()}`
            : `phone:${this.normalizePhone(payload.phone ?? '')}`;
        const rateLimitKey = `order-track:${createHash('sha256').update(identifier).digest('hex')}`;
        const accepted = await this.redis.set(rateLimitKey, '1', 'EX', 10, 'NX');
        if (accepted !== 'OK') {
            throw new HttpException(
                'Please wait before trying again',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const query = this.orders
            .createQueryBuilder('order')
            .where('order.userId IS NULL')
            .andWhere(
                payload.email
                    ? 'LOWER(order.email) = :email'
                    : "regexp_replace(COALESCE(order.phone, ''), '[^0-9]', '', 'g') = :phone",
                payload.email
                    ? { email: payload.email.trim().toLowerCase() }
                    : { phone: this.normalizePhone(payload.phone ?? '') },
            )
            .orderBy('order.createdAt', 'DESC')
            .take(20);
        const orders = await query.getMany();
        return orders.map((order) => ({
            id: order.id,
            createdAt: order.createdAt,
            status: order.status,
            trackingCode: order.trackingCode,
            paymentMethod: order.paymentMethod,
            subtotal: Number(order.subtotal),
            shippingFee: Number(order.shippingFee),
            discountAmount: Number(order.discountAmount ?? 0),
            totalAmount: Number(order.totalAmount),
        }));
    }

    private normalizePhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        return digits.startsWith('84') && digits.length === 11 ? `0${digits.slice(2)}` : digits;
    }

    private calculateDiscount(discount: DiscountEntity, subtotal: number): number {
        const now = new Date();
        if (
            (discount.startDate && now < discount.startDate) ||
            (discount.endDate && now > discount.endDate)
        ) {
            throw new BadRequestException('Voucher code is not valid at this time');
        }
        if (
            discount.usageLimit !== null &&
            discount.usedCount !== null &&
            discount.usedCount >= discount.usageLimit
        ) {
            throw new BadRequestException('Voucher code usage limit has been reached');
        }
        const discountAmount =
            discount.type === DiscountType.FIXED
                ? Number(discount.value)
                : (subtotal * Number(discount.value)) / 100;
        return Math.min(discountAmount, subtotal);
    }

    async createOrder(payload: CreateOrderDto, userId: string | null = null) {
        const data = await this.orderData(payload);
        return this.dataSource.transaction(async (manager) => {
            for (const item of data.stock) {
                const result = await manager
                    .createQueryBuilder()
                    .update(ProductVariantEntity)
                    .set({ stockQuantity: () => `stock_quantity - ${item.quantity}` })
                    .where('id = :id AND stock_quantity >= :quantity', item)
                    .execute();
                if (!result.affected) {
                    throw new BadRequestException(
                        'Insufficient stock for product variant ID: ' + item.id,
                    );
                }
            }
            if (data.appliedVoucher) {
                const discount = await manager.findOne(DiscountEntity, {
                    where: { code: data.appliedVoucher, isActive: true },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!discount) {
                    throw new BadRequestException('Invalid voucher code');
                }
                const discountAmount = this.calculateDiscount(discount, data.subtotal);
                await manager.increment(
                    DiscountEntity,
                    { code: data.appliedVoucher },
                    'usedCount',
                    1,
                );
                data.discountAmount = discountAmount;
                data.totalAmount = data.subtotal - discountAmount;
            }
            const order = await manager.save(OrderEntity, {
                userId,
                email: payload.email,
                fullName: payload.fullName,
                phone: payload.phone,
                subtotal: String(data.subtotal),
                shippingFee: '0',
                discountAmount: String(data.discountAmount),
                totalAmount: String(data.totalAmount),
                appliedVoucher: data.appliedVoucher,
                shippingAddress: payload.shippingAddress as unknown as Record<string, unknown>,
                paymentMethod: payload.paymentMethod,
                note: payload.note ?? null,
            });
            await manager.save(
                OrderItemEntity,
                data.orderItems.map((item) => ({ ...item, orderId: order.id })),
            );
            return manager.findOneOrFail(OrderEntity, {
                where: { id: order.id },
                relations: { orderItems: true },
            });
        });
    }

    async cancelOrder(orderId: string, userId: string) {
        const order = await this.orders.findOneBy({ id: orderId, userId });
        if (!order) {
            throw new BadRequestException('Order not found');
        }
        if (order.status !== 'PENDING') {
            throw new BadRequestException('Only pending orders can be cancelled');
        }
        return this.orders.save({ ...order, status: 'CANCELLED' });
    }

    async getOrderDetailForAdmin(orderId: string) {
        const order = await this.getOrderById(orderId);
        if (!order) {
            throw new BadRequestException('Order not found');
        }
        return order;
    }

    async changeOrderStatusForAdmin(orderId: string, status: string) {
        const order = await this.getOrderById(orderId);
        if (!order) {
            throw new BadRequestException('Order not found');
        }
        if (order.status === status) {
            throw new BadRequestException('Order is already in the desired status');
        }
        return this.orders.save({ ...order, status });
    }
}
