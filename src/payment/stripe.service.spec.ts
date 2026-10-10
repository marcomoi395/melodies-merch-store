import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

const configuration = {
    STRIPE_ENVIRONMENT: 'test',
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    CUSTOMER_APP_URL: 'https://store.example',
};
function fixture() {
    const payment = Object.assign(new TransactionEntity(), {
        id: randomUUID(),
        orderId: randomUUID(),
        provider: 'STRIPE',
        type: 'PAYMENT',
        amount: '150000',
        status: 'PENDING',
        createdAt: new Date(),
        rawResponse: {} as Record<string, unknown>,
    });
    const order = { id: payment.orderId, status: 'PENDING', appliedVoucher: 'SALE' };
    const builder: any = {};
    for (const key of ['update', 'set', 'where', 'andWhere', 'setParameter']) {
        builder[key] = jest.fn(() => builder);
    }
    builder.execute = jest.fn(async () => ({ affected: 1 }));
    const manager = {
        query: jest.fn(),
        findOne: jest.fn(async () => payment),
        findOneOrFail: jest.fn(async () => order),
        find: jest.fn(async () => [{ productVariantId: 'variant', quantity: 2 }]),
        increment: jest.fn(),
        save: jest.fn(async (_entity, value) => value),
        createQueryBuilder: jest.fn(() => builder),
    };
    const repository = {
        findOneBy: jest.fn(async () => payment),
        findOneByOrFail: jest.fn(async () => payment),
        createQueryBuilder: jest.fn(() => builder),
    };
    const source = {
        transaction: jest.fn(async (callback) => callback(manager)),
        getRepository: jest.fn(() => repository),
    };
    const service = new StripeService(
        new ConfigService(configuration),
        source as unknown as DataSource,
    );
    const session = {
        id: 'cs_test_fixture',
        livemode: false,
        currency: 'vnd',
        amount_total: 150000,
        client_reference_id: payment.id,
        metadata: { paymentId: payment.id, orderId: payment.orderId },
        status: 'complete',
        payment_status: 'paid',
        payment_intent: 'pi_fixture',
        url: null as string | null,
    };
    const raw = () =>
        Buffer.from(
            JSON.stringify({
                livemode: false,
                type: 'checkout.session.completed',
                data: { object: session },
            }),
        );
    return { service, payment, order, manager, source, repository, builder, session, raw };
}
function signature(raw: Buffer, timestamp = Math.floor(Date.now() / 1000)) {
    return `t=${timestamp},v1=${createHmac('sha256', configuration.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.`).update(raw).digest('hex')}`;
}
const originalFetch = global.fetch;
afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});

describe('Stripe test checkout', () => {
    it('rejects missing/live credentials and invalid amounts before reserving inventory', () => {
        for (const config of [
            {},
            { ...configuration, STRIPE_SECRET_KEY: 'sk_live_fixture' },
            { ...configuration, STRIPE_ENVIRONMENT: 'live' },
        ]) {
            expect(() =>
                new StripeService(new ConfigService(config), {} as DataSource).validateAmount(
                    150000,
                ),
            ).toThrow();
        }
        for (const amount of [0, 11999, 15000.5, NaN, 100000000]) {
            expect(() => fixture().service.validateAmount(amount)).toThrow();
        }
    });

    it('persists stable checkout parameters, uses VND without multiplying by 100, and reuses idempotency key', async () => {
        const f = fixture();
        const prepared = await f.service.prepare(
            f.manager as any,
            { id: f.order.id, totalAmount: '150000' } as any,
        );
        Object.assign(f.payment, prepared);
        Object.assign(f.session, {
            client_reference_id: f.payment.id,
            metadata: { paymentId: f.payment.id, orderId: f.payment.orderId },
            status: 'open',
            payment_status: 'unpaid',
            url: 'https://checkout.stripe.com/c/pay/test',
        });
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => f.session });
        await expect(f.service.create(f.payment)).resolves.toEqual({
            paymentId: f.payment.id,
            paymentUrl: f.session.url,
        });
        await f.service.create(f.payment);
        const calls = (global.fetch as jest.Mock).mock.calls;
        expect(calls[0][0]).toBe('https://api.stripe.com/v1/checkout/sessions');
        expect(calls[0][1].headers['Idempotency-Key']).toBe(f.payment.id);
        expect(calls[1][1].body).toBe(calls[0][1].body);
        const body = new URLSearchParams(calls[0][1].body);
        expect(body.get('line_items[0][price_data][unit_amount]')).toBe('150000');
        expect(body.get('line_items[0][price_data][currency]')).toBe('vnd');
        expect(body.get('success_url')).toContain('provider=stripe');
        expect(f.payment.status).toBe('PENDING');
    });

    it('keeps reservations on timeout, rejects foreign checkout URLs, never retries after retention', async () => {
        const f = fixture();
        f.payment.rawResponse = { checkoutBody: 'mode=payment' };
        global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
        expect((await f.service.create(f.payment)).paymentUrl).toBeNull();
        expect(f.payment.status).toBe('PENDING');
        Object.assign(f.session, {
            status: 'open',
            payment_status: 'unpaid',
            url: 'https://attacker.example/pay',
        });
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => f.session });
        expect((await f.service.create(f.payment)).paymentUrl).toBeNull();
        expect(f.manager.increment).not.toHaveBeenCalled();
        f.payment.createdAt = new Date(Date.now() - 24 * 3600000);
        (global.fetch as jest.Mock).mockClear();
        await f.service.create(f.payment);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects forged/stale signatures and mismatched amount, currency, mode, order and session IDs', async () => {
        const f = fixture();
        await expect(f.service.webhook(f.raw(), 't=1,v1=bad')).rejects.toThrow();
        await expect(f.service.webhook(f.raw(), signature(f.raw(), 1))).rejects.toThrow();
        await expect(f.service.webhook(Buffer.from('{}'), signature(f.raw()))).rejects.toThrow();
        expect(f.source.transaction).not.toHaveBeenCalled();
        for (const change of [
            { amount_total: 1 },
            { currency: 'usd' },
            { livemode: true },
            { client_reference_id: randomUUID() },
            { metadata: { paymentId: f.payment.id, orderId: randomUUID() } },
        ]) {
            const fresh = fixture();
            Object.assign(fresh.session, change);
            await expect(
                fresh.service.webhook(fresh.raw(), signature(fresh.raw())),
            ).rejects.toThrow();
            expect(fresh.manager.save).not.toHaveBeenCalled();
        }
        f.payment.rawResponse = { sessionId: 'cs_test_other' };
        await expect(f.service.webhook(f.raw(), signature(f.raw()))).rejects.toThrow();
    });

    it('confirms signed success once; ignores browser cancellation and unpaid open checkout', async () => {
        const f = fixture();
        Object.assign(f.session, { status: 'open', payment_status: 'unpaid' });
        await f.service.webhook(f.raw(), signature(f.raw()));
        expect(f.payment.status).toBe('PENDING');
        Object.assign(f.session, { status: 'complete', payment_status: 'paid' });
        await f.service.webhook(f.raw(), signature(f.raw()));
        await f.service.webhook(f.raw(), signature(f.raw()));
        expect(f.payment.status).toBe('SUCCESS');
        expect(f.order.status).toBe('PROCESSING');
        expect(f.manager.save).toHaveBeenCalledTimes(2);
        expect(f.manager.increment).not.toHaveBeenCalled();
    });

    it('releases stock and voucher exactly once on expiry; flags late success for review', async () => {
        const f = fixture();
        Object.assign(f.session, { status: 'expired', payment_status: 'unpaid' });
        await f.service.webhook(f.raw(), signature(f.raw()));
        await f.service.webhook(f.raw(), signature(f.raw()));
        expect(f.payment.status).toBe('FAILED');
        expect(f.order.status).toBe('CANCELLED');
        expect(f.manager.increment).toHaveBeenCalledTimes(1);
        expect(f.builder.execute).toHaveBeenCalledTimes(1);
        Object.assign(f.session, { status: 'complete', payment_status: 'paid' });
        await f.service.webhook(f.raw(), signature(f.raw()));
        expect(f.payment.status).toBe('SUCCESS');
        expect(f.payment.rawResponse?.requiresReview).toBe(true);
        expect(f.order.status).toBe('PENDING');
    });

    it('reconciles using server API when webhook was missed; throttle avoids repeated queries', async () => {
        const f = fixture();
        f.payment.rawResponse = { sessionId: f.session.id };
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => f.session });
        expect(await f.service.refresh(f.payment.id)).toMatchObject({
            status: 'SUCCESS',
            paymentUrl: null,
        });
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/cs_test_fixture');
        f.payment.status = 'PENDING';
        f.builder.execute.mockResolvedValue({ affected: 0 });
        (global.fetch as jest.Mock).mockClear();
        await f.service.refresh(f.payment.id);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

describe('Stripe HTTP webhook', () => {
    let app: INestApplication;
    afterEach(async () => {
        await app?.close();
    });
    it('verifies the original request bytes; returns 204 only after durable settlement', async () => {
        const f = fixture();
        const module = await Test.createTestingModule({
            controllers: [StripeController],
            providers: [{ provide: StripeService, useValue: f.service }],
        }).compile();
        app = module.createNestApplication({ rawBody: true });
        app.setGlobalPrefix('api');
        await app.init();
        const raw = f.raw();
        await request(app.getHttpServer())
            .post('/api/payment/stripe/webhook')
            .set('Content-Type', 'application/json')
            .set('stripe-signature', signature(raw))
            .send(raw.toString())
            .expect(204);
        expect(f.order.status).toBe('PROCESSING');
        await request(app.getHttpServer())
            .post('/api/payment/stripe/webhook')
            .send(JSON.parse(raw.toString()))
            .expect(400);
        const response = await request(app.getHttpServer())
            .get(`/api/payment/stripe/${f.payment.id}/status`)
            .expect(200);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.body.data).toMatchObject({ status: 'SUCCESS', amount: 150000 });
        expect(response.body.data.rawResponse).toBeUndefined();
    });
});
