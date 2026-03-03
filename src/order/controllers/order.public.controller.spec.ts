import { Test, TestingModule } from '@nestjs/testing';
import { OrderPublicController } from './order.public.controller';
import { OrderService } from '../order.service';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from 'src/shared/guards/optional-jwt-auth.guard';

describe('OrderPublicController', () => {
    let controller: OrderPublicController;
    let service: OrderService;

    const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        status: 'pending',
        totalPrice: 100,
    };

    const mockOrderService = {
        getOrdersByUserId: jest.fn(),
        getOrderById: jest.fn(),
        previewOrder: jest.fn(),
        createOrder: jest.fn(),
        cancelOrder: jest.fn(),
    };

    const mockUser = {
        sub: 'user_123',
        email: 'test@example.com',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderPublicController],
            providers: [
                {
                    provide: OrderService,
                    useValue: mockOrderService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(OptionalJwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrderPublicController>(OrderPublicController);
        service = module.get<OrderService>(OrderService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getOrders', () => {
        it('should return user orders', async () => {
            const mockResult = {
                data: [mockOrder],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
            };

            mockOrderService.getOrdersByUserId.mockResolvedValue(mockResult);

            const result = await controller.getOrders({ user: mockUser } as any, {
                page: 1,
                limit: 20,
            });

            expect(service.getOrdersByUserId).toHaveBeenCalledWith('user_123', {
                page: 1,
                limit: 20,
            });
            expect(result).toEqual({
                statusCode: 200,
                message: 'Orders retrieved successfully',
                data: expect.any(Array),
                meta: mockResult.meta,
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.getOrdersByUserId.mockRejectedValue(new Error('Database error'));
            await expect(
                controller.getOrders({ user: mockUser } as any, { page: 1, limit: 20 }),
            ).rejects.toThrow('Database error');
        });
    });

    describe('getOrderByOrderId', () => {
        it('should return order by id', async () => {
            mockOrderService.getOrderById.mockResolvedValue(mockOrder);

            const result = await controller.getOrderByOrderId('order_123');

            expect(service.getOrderById).toHaveBeenCalledWith('order_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Order retrieved successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.getOrderById.mockRejectedValue(new Error('Order not found'));
            await expect(controller.getOrderByOrderId('invalid_id')).rejects.toThrow(
                'Order not found',
            );
        });
    });

    describe('previewOrder', () => {
        it('should return order preview', async () => {
            const previewDto = {
                items: [{ productVariantId: 'var_123', quantity: 2 }],
                shippingAddress: '123 Test St',
                shippingFee: 10,
            };

            const mockPreview = {
                items: [],
                totalPrice: 110,
                shippingFee: 10,
            };

            mockOrderService.previewOrder.mockResolvedValue(mockPreview);

            const result = await controller.previewOrder(previewDto);

            expect(service.previewOrder).toHaveBeenCalledWith(previewDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Order preview generated successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.previewOrder.mockRejectedValue(new Error('Invalid product variants'));
            await expect(
                controller.previewOrder({ items: [], shippingAddress: '', shippingFee: 0 } as any),
            ).rejects.toThrow('Invalid product variants');
        });
    });

    describe('createOrder', () => {
        it('should create an order successfully', async () => {
            const createOrderDto = {
                items: [{ productVariantId: 'var_123', quantity: 2 }],
                shippingAddress: '123 Test St',
                shippingFee: 10,
            };

            mockOrderService.createOrder.mockResolvedValue(mockOrder);

            const result = await controller.createOrder(
                { user: mockUser } as any,
                createOrderDto as any,
            );

            expect(service.createOrder).toHaveBeenCalledWith(createOrderDto, mockUser.sub);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Order created successfully',
                data: expect.any(Object),
            });
        });

        it('should create order for guest (no user)', async () => {
            const createOrderDto = {
                items: [{ productVariantId: 'var_123', quantity: 1 }],
                shippingAddress: '123 Test St',
                shippingFee: 5,
            };

            mockOrderService.createOrder.mockResolvedValue(mockOrder);

            const result = await controller.createOrder(
                { user: null } as any,
                createOrderDto as any,
            );

            expect(service.createOrder).toHaveBeenCalledWith(createOrderDto, null);
            expect(result.statusCode).toBe(201);
        });

        it('should propagate errors from service', async () => {
            mockOrderService.createOrder.mockRejectedValue(new Error('Out of stock'));
            await expect(
                controller.createOrder({ user: mockUser } as any, {} as any),
            ).rejects.toThrow('Out of stock');
        });
    });

    describe('cancelOrder', () => {
        it('should cancel an order successfully', async () => {
            mockOrderService.cancelOrder.mockResolvedValue(undefined);

            const result = await controller.cancelOrder({ user: mockUser } as any, 'order_123');

            expect(service.cancelOrder).toHaveBeenCalledWith('order_123', mockUser.sub);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Order cancelled successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.cancelOrder.mockRejectedValue(new Error('Order cannot be cancelled'));
            await expect(
                controller.cancelOrder({ user: mockUser } as any, 'order_123'),
            ).rejects.toThrow('Order cannot be cancelled');
        });
    });
});
