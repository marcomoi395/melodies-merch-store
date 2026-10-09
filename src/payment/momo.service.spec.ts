import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { MomoController } from './momo.controller';
import { MomoService } from './momo.service';

const configuration = {
    MOMO_ENVIRONMENT: 'sandbox',
    MOMO_PARTNER_CODE: 'merchant',
    MOMO_ACCESS_KEY: 'access',
    MOMO_SECRET_KEY: 'secret',
    API_URL: 'https://store.example/api',
    CUSTOMER_APP_URL: 'https://store.example',
};
const hmac = (raw: string) => createHmac('sha256', 'secret').update(raw).digest('hex');

function fixture() {
    const payment = Object.assign(new TransactionEntity(), {
        id: randomUUID(),
        orderId: randomUUID(),
        provider: 'MOMO',
        type: 'PAYMENT',
        amount: '150000',
        status: 'PENDING',
        rawResponse: { requestId: randomUUID() } as Record<string, unknown>,
    });
    const order = { id: payment.orderId, status: 'PENDING', appliedVoucher: 'SALE' };
    const manager = {
        query: jest.fn(),
        findOne: jest.fn(async (entity, _options) =>
            entity === TransactionEntity ? payment : order,
        ),
        findOneOrFail: jest.fn(async () => order),
        find: jest.fn(async () => [{ productVariantId: 'variant', quantity: 2 }]),
        increment: jest.fn(),
        save: jest.fn(async (_entity, value) => value),
        createQueryBuilder: jest.fn(),
    };
    const builder: any = {};
    for (const key of ['update', 'set', 'where', 'andWhere', 'setParameter']) {
        builder[key] = jest.fn(() => builder);
    }
    builder.execute = jest.fn(async () => ({ affected: 1 }));
    manager.createQueryBuilder.mockReturnValue(builder);
    const repository = {
        findOneBy: jest.fn(async () => payment),
        findOneByOrFail: jest.fn(async () => payment),
        createQueryBuilder: jest.fn(() => builder),
    };
    const source = {
        transaction: jest.fn(async (callback) => callback(manager)),
        getRepository: jest.fn(() => repository),
    };
    const config = new ConfigService(configuration);
    const service = new MomoService(config, source as unknown as DataSource);
    const payload = (resultCode = 0, amount = 150000) => {
        const body = {
            partnerCode: 'merchant',
            orderId: payment.id,
            requestId: String(payment.rawResponse.requestId),
            amount,
            extraData: '',
            message: 'Success',
            orderInfo: 'Payment',
            orderType: 'momo_wallet',
            payType: 'qr',
            responseTime: 1710000000000,
            resultCode,
            transId: 12345,
        };
        const raw = `accessKey=access&amount=${amount}&extraData=&message=Success&orderId=${body.orderId}&orderInfo=Payment&orderType=momo_wallet&partnerCode=merchant&payType=qr&requestId=${body.requestId}&responseTime=1710000000000&resultCode=${resultCode}&transId=12345`;
        return { ...body, signature: hmac(raw) };
    };
    return { payment, order, manager, builder, repository, source, config, service, payload };
}

const originalFetch = global.fetch;
afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});

describe('MoMo gateway', () => {
    it('signs sandbox captureWallet checkout, uses public callbacks and returns the payment URL', async () => {
        const f = fixture();
        const fetchMock = jest.fn(async (_url, options) => {
            const body = JSON.parse(options.body);
            expect(body.accessKey).toBeUndefined();
            expect(body.autoCapture).toBe(true);
            expect(body.signature).toBe(
                hmac(
                    `accessKey=access&amount=150000&extraData=&ipnUrl=https://store.example/api/payment/momo/ipn&orderId=${f.payment.id}&orderInfo=Thanh toan don hang ${f.order.id}&partnerCode=merchant&redirectUrl=https://store.example/api/payment/momo/return?payment=${f.payment.id}&requestId=${String(f.payment.rawResponse.requestId)}&requestType=captureWallet`,
                ),
            );
            return {
                ok: true,
                json: async () => ({
                    partnerCode: body.partnerCode,
                    orderId: body.orderId,
                    requestId: body.requestId,
                    amount: body.amount,
                    resultCode: 0,
                    payUrl: 'https://test-payment.momo.vn/pay',
                }),
            };
        });
        global.fetch = fetchMock as any;
        await expect(f.service.create(f.payment)).resolves.toEqual({
            paymentId: f.payment.id,
            paymentUrl: 'https://test-payment.momo.vn/pay',
        });
        expect(fetchMock.mock.calls[0][0]).toBe(
            'https://test-payment.momo.vn/v2/gateway/api/create',
        );
        expect(f.payment.status).toBe('PENDING');
    });

    it.each([999, 50000001, 1500.5, NaN])('rejects invalid MoMo amount %s', (amount) => {
        expect(() => fixture().service.validateAmount(amount)).toThrow();
    });

    it('fails closed without merchant configuration', () => {
        const service = new MomoService(new ConfigService({}), {} as DataSource);
        expect(() => service.validateAmount(150000)).toThrow('MoMo sandbox cần khóa merchant thật');
    });

    it('fails closed with test placeholders', () => {
        const service = new MomoService(
            new ConfigService({
                ...configuration,
                MOMO_SECRET_KEY: 'REPLACE_WITH_SANDBOX_SECRET_KEY',
            }),
            {} as DataSource,
        );
        expect(() => service.validateAmount(150000)).toThrow('MoMo sandbox cần khóa merchant thật');
    });

    it('keeps stock reserved after timeout; never creates another order', async () => {
        const f = fixture();
        global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
        await expect(f.service.create(f.payment)).resolves.toEqual({
            paymentId: f.payment.id,
            paymentUrl: null,
        });
        expect(f.payment.status).toBe('PENDING');
        expect(f.manager.increment).not.toHaveBeenCalled();
    });

    it('rejects foreign checkout URLs', async () => {
        const f = fixture();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                partnerCode: 'merchant',
                orderId: f.payment.id,
                requestId: f.payment.rawResponse.requestId,
                resultCode: 0,
                payUrl: 'https://attacker.example/pay',
            }),
        });
        expect((await f.service.create(f.payment)).paymentUrl).toBeNull();
    });

    it('verifies IPN and ignores duplicate success/stale failure callbacks', async () => {
        const f = fixture();
        await f.service.ipn(f.payload());
        await f.service.ipn(f.payload());
        await f.service.ipn(f.payload(1006));
        expect(f.payment.status).toBe('SUCCESS');
        expect(f.order.status).toBe('PROCESSING');
        expect(f.manager.save).toHaveBeenCalledTimes(2);
        expect(f.manager.increment).not.toHaveBeenCalled();
        expect(f.manager.findOne.mock.calls[0][1].lock.mode).toBe('pessimistic_write');
    });

    it('restores stock/voucher once after signed terminal failure', async () => {
        const f = fixture();
        await f.service.ipn(f.payload(1005));
        await f.service.ipn(f.payload(1005));
        expect(f.payment.status).toBe('FAILED');
        expect(f.order.status).toBe('CANCELLED');
        expect(f.manager.increment).toHaveBeenCalledTimes(1);
        expect(f.manager.increment.mock.calls[0].slice(1)).toEqual([
            { id: 'variant' },
            'stockQuantity',
            2,
        ]);
        expect(f.manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('records late verified success for staff review after stock release', async () => {
        const f = fixture();
        await f.service.ipn(f.payload(1006));
        await f.service.ipn(f.payload(0));
        expect(f.payment.status).toBe('SUCCESS');
        expect(f.payment.rawResponse.requiresReview).toBe(true);
        expect(f.order.status).toBe('PENDING');
    });

    it.each([1000, 7000, 7002, 9000, 42, 99, 5555])('leaves code %s unresolved', async (code) => {
        const f = fixture();
        await f.service.ipn(f.payload(code));
        expect(f.payment.status).toBe('PENDING');
        expect(f.manager.save).not.toHaveBeenCalled();
    });

    it('rejects forged/malformed IPNs before touching the database', async () => {
        const f = fixture();
        await expect(f.service.ipn({ ...f.payload(), signature: '0'.repeat(64) })).rejects.toThrow(
            'Invalid MoMo signature',
        );
        await expect(f.service.ipn({ ...f.payload(), amount: '150000' })).rejects.toThrow(
            'Invalid MoMo result',
        );
        expect(f.source.transaction).not.toHaveBeenCalled();
    });

    it('rejects signed amount/request mismatches', async () => {
        const f = fixture();
        await expect(f.service.ipn(f.payload(0, 200000))).rejects.toThrow('MoMo payment mismatch');
        const body = f.payload();
        f.payment.rawResponse.requestId = randomUUID();
        await expect(f.service.ipn(body)).rejects.toThrow('MoMo payment mismatch');
        expect(f.manager.save).not.toHaveBeenCalled();
    });

    it('reconciles using a signed query; rejects mismatched query amounts', async () => {
        const f = fixture();
        global.fetch = jest.fn(async (_url, options) => {
            const body = JSON.parse(options!.body as string);
            expect(body.signature).toBe(
                hmac(
                    `accessKey=access&orderId=${f.payment.id}&partnerCode=merchant&requestId=${body.requestId}`,
                ),
            );
            return {
                ok: true,
                json: async () => ({ ...f.payload(), requestId: body.requestId }),
            } as Response;
        });
        expect((await f.service.refresh(f.payment.id)).status).toBe('SUCCESS');
        expect(f.order.status).toBe('PROCESSING');
        const other = fixture();
        global.fetch = jest.fn(async (_url, options) => {
            const body = JSON.parse(options!.body as string);
            return {
                ok: true,
                json: async () => ({ ...other.payload(0, 200000), requestId: body.requestId }),
            } as Response;
        });
        expect((await other.service.refresh(other.payment.id)).status).toBe('PENDING');
    });

    it('retries unknown creation with the same order/request IDs without releasing stock', async () => {
        const f = fixture();
        f.payment.rawResponse.createAttempted = true;
        global.fetch = jest.fn(async (url, options) => {
            const body = JSON.parse(options!.body as string);
            if (typeof url === 'string' && url.endsWith('/query')) {
                return {
                    ok: true,
                    json: async () => ({
                        partnerCode: 'merchant',
                        orderId: f.payment.id,
                        requestId: body.requestId,
                        resultCode: 42,
                    }),
                } as Response;
            }
            expect(body.orderId).toBe(f.payment.id);
            expect(body.requestId).toBe(f.payment.rawResponse.requestId);
            return {
                ok: true,
                json: async () => ({ partnerCode: 'merchant', ...body, resultCode: 22 }),
            } as Response;
        });
        expect((await f.service.refresh(f.payment.id)).status).toBe('PENDING');
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(f.manager.increment).not.toHaveBeenCalled();
    });
});

describe('MoMo HTTP endpoints', () => {
    let app: INestApplication;
    let f: ReturnType<typeof fixture>;
    beforeEach(async () => {
        f = fixture();
        const module = await Test.createTestingModule({
            controllers: [MomoController],
            providers: [{ provide: MomoService, useValue: f.service }],
        }).compile();
        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();
        await app.listen(0, '127.0.0.1');
    });
    afterEach(async () => {
        await app.close();
    });

    it('acknowledges verified IPN with an empty 204; rejects forged IPN', async () => {
        await request(app.getHttpServer())
            .post('/api/payment/momo/ipn')
            .send(f.payload())
            .expect(204)
            .expect('');
        await request(app.getHttpServer())
            .post('/api/payment/momo/ipn')
            .send({ ...f.payload(), signature: 'bad' })
            .expect(400);
    });

    it('returns to the fixed storefront URL without trusting resultCode query values', async () => {
        const response = await request(app.getHttpServer())
            .get(
                `/api/payment/momo/return?payment=${f.payment.id}&resultCode=0&redirect=https://attacker.example`,
            )
            .expect(303);
        expect(response.headers.location).toBe(
            `https://store.example/payment/result?payment=${f.payment.id}`,
        );
        expect(f.payment.status).toBe('PENDING');
        await request(app.getHttpServer())
            .get('/api/payment/momo/return?payment=invalid')
            .expect(400);
    });

    it('returns only payment status, without customer data; prevents caching', async () => {
        f.payment.status = 'SUCCESS';
        const response = await request(app.getHttpServer())
            .get(`/api/payment/momo/${f.payment.id}/status`)
            .expect(200);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.body.data).toEqual({
            paymentId: f.payment.id,
            orderId: f.payment.orderId,
            status: 'SUCCESS',
            amount: 150000,
            requiresReview: false,
            paymentUrl: null,
        });
    });
});
