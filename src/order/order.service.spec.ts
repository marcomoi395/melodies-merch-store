import { OrderService } from './order.service';
import { validateSync } from 'class-validator';
import { TrackOrderDto } from './dto/track-order.dto';

it('allows the SQLi payload only in the explicitly enabled development lab', async () => {
    const original = { ...process.env };
    const builder = {
        setFindOptions: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    };
    const service = new OrderService(
        { createQueryBuilder: () => builder } as any,
        {} as any,
        {} as any,
        {} as any,
        { set: async () => 'OK' } as any,
        {} as any,
        {} as any,
    );
    const payload = Object.assign(new TrackOrderDto(), { phone: "')>0 OR TRUE --" });
    try {
        process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'ab'.repeat(32);
        for (const [environment, enabled, vulnerable] of [
            ['development', 'true', true],
            ['development', 'false', false],
            ['production', 'true', false],
        ] as const) {
            process.env.NODE_ENV = environment;
            process.env.TRACK_SQL_INJECTION_DEMO = enabled;
            builder.andWhere.mockClear();
            expect(validateSync(payload).length === 0).toBe(vulnerable);
            expect(
                validateSync(Object.assign(new TrackOrderDto(), { phone: 1234567 })).length,
            ).toBeGreaterThan(0);
            await service.trackGuestOrders(payload);
            expect(builder.andWhere.mock.calls.some(([sql]) => sql.includes('OR TRUE'))).toBe(
                vulnerable,
            );
        }
    } finally {
        process.env = original;
    }
});

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

describe('COD / MoMo / Stripe checkout', () => {
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
        const stripe = {
            ...momo,
            validateAmount: jest.fn(),
            prepare: jest.fn(async () => ({ id: 'stripe-payment' })),
            create: jest.fn(async () => ({
                paymentId: 'stripe-payment',
                paymentUrl: 'https://checkout.stripe.com/c/pay/test',
            })),
        };
        const service = new OrderService(
            {} as any,
            { find: async () => [variant] } as any,
            {} as any,
            source as any,
            {} as any,
            momo as any,
            stripe as any,
        );
        const body = {
            fullName: 'Guest',
            email: 'guest@example.com',
            phone: '0901234567',
            shippingAddress: '123 Street',
            items: [{ productVariantId: 'variant', quantity: 1 }],
        };
        return { service, source, manager, momo, stripe, body };
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

    it('creates Stripe checkout after persisting its attempt', async () => {
        const f = checkout();
        expect(
            await f.service.createOrder({ ...f.body, paymentMethod: 'STRIPE' } as any),
        ).toMatchObject({
            paymentId: 'stripe-payment',
            paymentUrl: 'https://checkout.stripe.com/c/pay/test',
        });
        expect(f.stripe.validateAmount).toHaveBeenCalledWith(150000);
        expect(f.stripe.prepare).toHaveBeenCalledWith(
            f.manager,
            expect.objectContaining({ id: 'order' }),
        );
        expect(f.momo.create).not.toHaveBeenCalled();
    });

    it.each(['MOMO', 'STRIPE'])(
        'rejects unavailable %s before reserving inventory',
        async (method) => {
            const f = checkout();
            const gateway = method === 'STRIPE' ? f.stripe : f.momo;
            gateway.validateAmount.mockImplementation(() => {
                throw new Error('Not configured');
            });
            await expect(
                f.service.createOrder({ ...f.body, paymentMethod: method } as any),
            ).rejects.toThrow('Not configured');
            expect(f.source.transaction).not.toHaveBeenCalled();
        },
    );
});

it.each(['MOMO', 'STRIPE'])('blocks canceling and fulfilling unpaid %s orders', async (method) => {
    const order = { id: 'order', paymentMethod: method, status: 'PENDING' };
    const orders = { findOneBy: jest.fn(async () => order), save: jest.fn() };
    const source = { getRepository: jest.fn(() => ({ findOneBy: jest.fn(async () => null) })) };
    const service = new OrderService(
        orders as any,
        {} as any,
        {} as any,
        source as any,
        {} as any,
        {} as any,
        {} as any,
    );
    jest.spyOn(service, 'getOrderById').mockResolvedValue(order as any);
    await expect(service.cancelOrder('order', 'user')).rejects.toThrow('payment gateway');
    await expect(service.changeOrderStatusForAdmin('order', 'PROCESSING')).rejects.toThrow(
        'not been confirmed',
    );
    expect(orders.save).not.toHaveBeenCalled();
});
