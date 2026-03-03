import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('OrderService', () => {
    let service: OrderService;
    let prisma: PrismaService;

    const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        status: 'pending',
        totalPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockOrderItem = {
        id: 'item_123',
        orderId: 'order_123',
        productId: 'prod_123',
        productVariantId: 'var_123',
        quantity: 2,
        price: 50,
    };

    const mockPrismaService = {
        order: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        orderItem: {
            findMany: jest.fn(),
        },
        productVariant: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        promotion: {
            findUnique: jest.fn(),
        },
        cart: {
            delete: jest.fn(),
        },
        cartItem: {
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getOrdersByUserId', () => {
        it('should return paginated orders', async () => {
            const mockOrders = [mockOrder];
            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
            mockPrismaService.order.count.mockResolvedValue(1);

            const result = await service.getOrdersByUserId('user_123', { page: 1, limit: 20 });

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user_123' },
                    take: 20,
                    skip: 0,
                }),
            );
            expect(result.data).toEqual(mockOrders);
            expect(result.meta.total).toBe(1);
        });

        it('should filter orders by status', async () => {
            mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
            mockPrismaService.order.count.mockResolvedValue(1);

            await service.getOrdersByUserId('user_123', {
                page: 1,
                limit: 20,
                status: 'pending',
            });

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user_123',
                        status: 'pending',
                    }),
                }),
            );
        });

        it('should filter orders by date range', async () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');

            mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
            mockPrismaService.order.count.mockResolvedValue(1);

            await service.getOrdersByUserId('user_123', {
                page: 1,
                limit: 20,
                startDate,
                endDate,
            });

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user_123',
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    }),
                }),
            );
        });
    });

    describe('getOrderById', () => {
        it('should return order by id', async () => {
            const mockOrderWithItems = {
                ...mockOrder,
                orderItems: [mockOrderItem],
            };

            mockPrismaService.order.findUnique.mockResolvedValue(mockOrderWithItems);

            const result = await service.getOrderById('order_123');

            expect(prisma.order.findUnique).toHaveBeenCalledWith({
                where: { id: 'order_123' },
                include: { orderItems: true },
            });
            expect(result).toEqual(mockOrderWithItems);
        });
    });

    describe('previewOrder', () => {
        it('should calculate order preview', async () => {
            const previewDto = {
                items: [
                    {
                        productVariantId: 'var_123',
                        quantity: 2,
                    },
                ],
                shippingAddress: '123 Test St',
                shippingFee: 10,
            };

            const mockProductVariant = {
                id: 'var_123',
                originalPrice: 50,
                discountPercent: 0,
                stockQuantity: 10,
                product: {
                    id: 'prod_123',
                    name: 'Test Product',
                    status: 'published',
                },
            };

            mockPrismaService.productVariant.findMany.mockResolvedValue([mockProductVariant]);

            const result = await service.previewOrder(previewDto);

            expect(result).toBeDefined();
            expect(result).toHaveProperty('orderItems');
            expect(result).toHaveProperty('totalAmount');
        });

        it('should throw BadRequestException if product variants are invalid', async () => {
            const previewDto = {
                items: [
                    {
                        productVariantId: 'var_123',
                        quantity: 2,
                    },
                ],
                shippingAddress: '123 Test St',
                shippingFee: 10,
            };

            mockPrismaService.productVariant.findMany.mockResolvedValue([]);

            await expect(service.previewOrder(previewDto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('getOrdersForAdmin', () => {
        it('should return paginated orders for admin', async () => {
            const mockOrders = [mockOrder];
            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
            mockPrismaService.order.count.mockResolvedValue(1);

            const result = await service.getOrdersForAdmin({ page: 1, limit: 20 });

            expect(prisma.order.findMany).toHaveBeenCalled();
            expect(result.data).toEqual(mockOrders);
            expect(result.meta.total).toBe(1);
        });
    });

    describe('getOrderDetailForAdmin', () => {
        it('should return order detail for admin', async () => {
            const mockOrderWithDetails = {
                ...mockOrder,
                orderItems: [mockOrderItem],
            };

            mockPrismaService.order.findUnique.mockResolvedValue(mockOrderWithDetails);

            const result = await service.getOrderDetailForAdmin('order_123');

            expect(prisma.order.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'order_123' },
                }),
            );
            expect(result).toEqual(mockOrderWithDetails);
        });

        it('should throw BadRequestException if order not found', async () => {
            mockPrismaService.order.findUnique.mockResolvedValue(null);

            await expect(service.getOrderDetailForAdmin('invalid_id')).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.getOrderDetailForAdmin('invalid_id')).rejects.toThrow(
                'Order not found',
            );
        });
    });

    describe('changeOrderStatusForAdmin', () => {
        it('should update order status', async () => {
            const updatedOrder = { ...mockOrder, status: 'shipped' };
            mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue(updatedOrder);

            const result = await service.changeOrderStatusForAdmin('order_123', 'shipped');

            expect(prisma.order.update).toHaveBeenCalledWith({
                where: { id: 'order_123' },
                data: { status: 'shipped' },
            });
            expect(result.status).toBe('shipped');
        });

        it('should throw BadRequestException if order not found', async () => {
            mockPrismaService.order.findUnique.mockResolvedValue(null);

            await expect(
                service.changeOrderStatusForAdmin('invalid_id', 'shipped'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
