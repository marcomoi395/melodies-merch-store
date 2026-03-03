import { Test, TestingModule } from '@nestjs/testing';
import { OrderAdminController } from './order.admin.controller';
import { OrderService } from '../order.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../../permissions/permissions.guard';

describe('OrderAdminController', () => {
    let controller: OrderAdminController;
    let service: OrderService;

    const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        status: 'pending',
        totalPrice: 100,
    };

    const mockOrderService = {
        getOrdersForAdmin: jest.fn(),
        getOrderDetailForAdmin: jest.fn(),
        changeOrderStatusForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderAdminController],
            providers: [
                {
                    provide: OrderService,
                    useValue: mockOrderService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrderAdminController>(OrderAdminController);
        service = module.get<OrderService>(OrderService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllOrders', () => {
        it('should return all orders for admin', async () => {
            const mockResult = {
                data: [mockOrder],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
            };

            mockOrderService.getOrdersForAdmin.mockResolvedValue(mockResult);

            const result = await controller.getAllOrders({ page: 1, limit: 20 });

            expect(service.getOrdersForAdmin).toHaveBeenCalledWith({ page: 1, limit: 20 });
            expect(result).toEqual({
                statusCode: 200,
                message: 'Orders retrieved successfully',
                data: expect.any(Array),
                meta: mockResult.meta,
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.getOrdersForAdmin.mockRejectedValue(new Error('Database error'));
            await expect(controller.getAllOrders({ page: 1, limit: 20 })).rejects.toThrow(
                'Database error',
            );
        });
    });

    describe('getOrderDetailForAdmin', () => {
        it('should return order detail for admin', async () => {
            mockOrderService.getOrderDetailForAdmin.mockResolvedValue(mockOrder);

            const result = await controller.getOrderDetailForAdmin('order_123');

            expect(service.getOrderDetailForAdmin).toHaveBeenCalledWith('order_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Order detail retrieved successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.getOrderDetailForAdmin.mockRejectedValue(new Error('Order not found'));
            await expect(controller.getOrderDetailForAdmin('invalid_id')).rejects.toThrow(
                'Order not found',
            );
        });
    });

    describe('changeOrderStatusForAdmin', () => {
        it('should update order status', async () => {
            const updatedOrder = { ...mockOrder, status: 'shipped' };
            mockOrderService.changeOrderStatusForAdmin.mockResolvedValue(updatedOrder);

            const result = await controller.changeOrderStatusForAdmin(
                { status: 'shipped' },
                'order_123',
            );

            expect(service.changeOrderStatusForAdmin).toHaveBeenCalledWith('order_123', 'shipped');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Order status updated successfully',
                data: expect.any(Object),
            });
        });

        it('should propagate errors from service', async () => {
            mockOrderService.changeOrderStatusForAdmin.mockRejectedValue(
                new Error('Invalid status transition'),
            );
            await expect(
                controller.changeOrderStatusForAdmin({ status: 'invalid' }, 'order_123'),
            ).rejects.toThrow('Invalid status transition');
        });
    });
});
