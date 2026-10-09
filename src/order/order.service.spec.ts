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

describe('COD / MoMo checkout', () => {
    function checkout() {
        const variant = {
            id: 'variant',
            productId: 'product',
            name: 'L',
            originalPrice: '150000',
            discountPercent: 0,
            stockQuantity: 3,
            product: { name: 'Shirt' },
        };
        const order = { id: 'order', totalAmount: '150000', orderItems: [] };
        const builder: any = {};
        for (const key of ['update', 'set', 'where']) {
            builder[key] = jest.fn(() => builder);
        }
        builder.execute = jest.fn(async () => ({ affected: 1 }));
        const manager = {
            createQueryBuilder: jest.fn(() => builder),
            save: jest.fn(async (_entity, _value) => order),
            findOneOrFail: jest.fn(async () => order),
        };
        const source = { transaction: jest.fn(async (callback) => callback(manager)) };
        const momo = {
            validateAmount: jest.fn(),
            prepare: jest.fn(async () => ({ id: 'payment' })),
            create: jest.fn(async () => ({
                paymentId: 'payment',
                paymentUrl: 'https://test-payment.momo.vn/pay',
            })),
        };
        const service = new OrderService(
            {} as any,
            { find: async () => [variant] } as any,
            {} as any,
            source as any,
            {} as any,
            momo as any,
        );
        const body = {
            fullName: 'Guest',
            email: 'guest@example.com',
            phone: '0901234567',
            shippingAddress: '123 Street',
            items: [{ productVariantId: 'variant', quantity: 1 }],
        };
        return { service, source, manager, momo, body };
    }

    it('COD creates an order without contacting MoMo', async () => {
        const f = checkout();
        await f.service.createOrder({ ...f.body, paymentMethod: 'COD' } as any);
        expect(f.momo.validateAmount).not.toHaveBeenCalled();
        expect(f.momo.prepare).not.toHaveBeenCalled();
        expect(f.momo.create).not.toHaveBeenCalled();
        expect(f.manager.save.mock.calls[0][1].paymentMethod).toBe('COD');
    });

    it('persists MoMo attempt with the order, then creates checkout after commit', async () => {
        const f = checkout();
        f.momo.create.mockImplementation(async () => {
            expect(f.source.transaction.mock.results[0].value).toBeInstanceOf(Promise);
            expect(f.momo.prepare).toHaveBeenCalledWith(
                f.manager,
                expect.objectContaining({ id: 'order' }),
            );
            return { paymentId: 'payment', paymentUrl: 'https://test-payment.momo.vn/pay' };
        });
        expect(
            await f.service.createOrder({ ...f.body, paymentMethod: 'MOMO' } as any),
        ).toMatchObject({
            paymentId: 'payment',
            paymentUrl: 'https://test-payment.momo.vn/pay',
        });
        expect(f.momo.validateAmount).toHaveBeenCalledWith(150000);
    });

    it('rejects unavailable MoMo before reserving inventory', async () => {
        const f = checkout();
        f.momo.validateAmount.mockImplementation(() => {
            throw new Error('Not configured');
        });
        await expect(
            f.service.createOrder({ ...f.body, paymentMethod: 'MOMO' } as any),
        ).rejects.toThrow('Not configured');
        expect(f.source.transaction).not.toHaveBeenCalled();
    });
});
