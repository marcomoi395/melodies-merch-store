import { OrderService } from './order.service';

describe('OrderService', () => {
    it('previews an order using TypeORM variant data', async () => {
        const variants = {
            find: jest.fn().mockResolvedValue([
                {
                    id: 'v1',
                    productId: 'p1',
                    name: 'L',
                    originalPrice: '100',
                    discountPercent: 10,
                    stockQuantity: 2,
                    product: { name: 'Shirt' },
                },
            ]),
        };
        const service = new OrderService(
            {} as any,
            variants as any,
            {} as any,
            {} as any,
            {} as any,
        );
        const result = await service.previewOrder({
            items: [{ productVariantId: 'v1', quantity: 1 }],
            shippingAddress: {},
            paymentMethod: 'COD',
        } as any);
        expect(result.totalAmount).toBe(90);
        expect(result.orderItems).toHaveLength(1);
    });
});
