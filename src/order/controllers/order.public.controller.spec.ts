import { Test, TestingModule } from '@nestjs/testing';
import { OrderPublicController } from './order.public.controller';
import { OrderService } from '../order.service';

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
        previewOrder: jest.fn(),
        trackGuestOrders: jest.fn(),
        createOrder: jest.fn(),
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
        }).compile();

        controller = module.get<OrderPublicController>(OrderPublicController);
        service = module.get<OrderService>(OrderService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
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

    it('returns only the tracking projection for a guest lookup', async () => {
        mockOrderService.trackGuestOrders.mockResolvedValue([
            {
                id: 'order_123',
                createdAt: new Date(),
                status: 'PENDING',
                trackingCode: null,
                paymentMethod: 'COD',
                subtotal: 100,
                shippingFee: 0,
                discountAmount: 0,
                totalAmount: 100,
                email: 'private@example.com',
            },
        ]);

        const result = await controller.trackOrders({ email: 'guest@example.com' });

        expect(service.trackGuestOrders).toHaveBeenCalledWith({ email: 'guest@example.com' });
        expect(result.data[0]).toEqual(
            expect.objectContaining({ id: 'order_123', totalAmount: 100 }),
        );
        expect(result.data[0]).not.toHaveProperty('email');
    });

    describe('createOrder', () => {
        it('should create an order successfully', async () => {
            const createOrderDto = {
                items: [{ productVariantId: 'var_123', quantity: 2 }],
                shippingAddress: '123 Test St',
                shippingFee: 10,
            };

            mockOrderService.createOrder.mockResolvedValue(mockOrder);

            const result = await controller.createOrder(createOrderDto as any);

            expect(service.createOrder).toHaveBeenCalledWith(createOrderDto);
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

            const result = await controller.createOrder(createOrderDto as any);

            expect(service.createOrder).toHaveBeenCalledWith(createOrderDto);
            expect(result.statusCode).toBe(201);
        });

        it('should propagate errors from service', async () => {
            mockOrderService.createOrder.mockRejectedValue(new Error('Out of stock'));
            await expect(controller.createOrder({} as any)).rejects.toThrow('Out of stock');
        });
    });
});
