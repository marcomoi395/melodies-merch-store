import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/database-options';
import { OrderEntity } from '../../src/database/entities/order.entity';
import { TransactionEntity } from '../../src/database/entities/transaction.entity';
import { StripeService } from '../../src/payment/stripe.service';
import { MomoService } from '../../src/payment/momo.service';
import { createSchema, dropSchema } from './postgres-lifecycle';

const describeDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDatabase('payment reconciliation across application/database timezones', () => {
    const schema = `test_payments_${randomUUID().replaceAll('-', '')}`;
    let source: DataSource;
    const originalFetch = global.fetch;
    beforeAll(async () => {
        await createSchema(process.env.TEST_DATABASE_URL!, schema);
        source = new DataSource({
            ...createDataSourceOptions({
                DATABASE_URL: process.env.TEST_DATABASE_URL,
                DATABASE_SCHEMA: schema,
            }),
            // Only this disposable test schema is synchronized.
            synchronize: true,
            migrations: [],
            extra: { options: '-c timezone=UTC' },
        });
        await source.initialize();
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });
    afterAll(async () => {
        if (source?.isInitialized) {
            await source.destroy();
        }
        await dropSchema(process.env.TEST_DATABASE_URL!, schema);
    });

    it.each(
        ['STRIPE', 'MOMO'].flatMap((provider) =>
            ['refresh', 'background'].map((path) => ({ provider, path })),
        ),
    )(
        'settles paid $provider through $path with UTC PostgreSQL and local application timestamps',
        async ({ provider, path }) => {
            const order = await source.getRepository(OrderEntity).save({
                subtotal: '840000',
                shippingFee: '0',
                totalAmount: '840000',
                shippingAddress: {},
                status: 'PENDING',
                paymentMethod: provider,
            });
            const payment = await source.getRepository(TransactionEntity).save({
                orderId: order.id,
                type: 'PAYMENT',
                provider,
                amount: '840000',
                status: 'PENDING',
                createdAt: new Date(Date.now() - 600000),
                rawResponse:
                    provider === 'STRIPE'
                        ? { sessionId: 'cs_test_fixture' }
                        : { requestId: randomUUID() },
            });
            await source.query(`UPDATE "${schema}".transactions SET updated_at=$1 WHERE id=$2`, [
                new Date(Date.now() - 10000),
                payment.id,
            ]);
            const config = new ConfigService({
                STRIPE_ENVIRONMENT: 'test',
                STRIPE_SECRET_KEY: 'sk_test_fixture',
                STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
                MOMO_ENVIRONMENT: 'sandbox',
                MOMO_PARTNER_CODE: 'merchant',
                MOMO_ACCESS_KEY: 'access',
                MOMO_SECRET_KEY: 'secret',
                API_URL: 'https://store.example/api',
                CUSTOMER_APP_URL: 'https://store.example',
            });
            global.fetch = jest.fn((_url, options) =>
                Promise.resolve(
                    Response.json(
                        provider === 'STRIPE'
                            ? {
                                  id: 'cs_test_fixture',
                                  livemode: false,
                                  currency: 'vnd',
                                  amount_total: 840000,
                                  client_reference_id: payment.id,
                                  metadata: { paymentId: payment.id, orderId: order.id },
                                  status: 'complete',
                                  payment_status: 'paid',
                                  payment_intent: 'pi_fixture',
                                  url: null,
                              }
                            : {
                                  partnerCode: 'merchant',
                                  orderId: payment.id,
                                  requestId: (
                                      JSON.parse(
                                          typeof options?.body === 'string' ? options.body : '{}',
                                      ) as { requestId: string }
                                  ).requestId,
                                  amount: 840000,
                                  resultCode: 0,
                                  transId: 12345,
                              },
                    ),
                ),
            );
            const gateway =
                provider === 'STRIPE'
                    ? new StripeService(config, source)
                    : new MomoService(config, source);
            if (path === 'refresh') {
                await gateway.refresh(payment.id);
            } else {
                await (gateway as unknown as { reconcile(): Promise<void> }).reconcile();
            }
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(
                (await source.getRepository(TransactionEntity).findOneByOrFail({ id: payment.id }))
                    .status,
            ).toBe('SUCCESS');
            expect(
                (await source.getRepository(OrderEntity).findOneByOrFail({ id: order.id })).status,
            ).toBe('PROCESSING');
        },
    );
});
