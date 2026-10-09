import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/database-options';
import { Initial20260106151610 } from '../../src/database/migrations/20260106151610-initial';
import { OrderEntity } from '../../src/database/entities/order.entity';
import { customerLookup } from '../../src/database/customer-encryption';
import { OrderService } from '../../src/order/order.service';
import { createSchema, dropSchema } from './postgres-lifecycle';

const describeDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDatabase('customer encryption PostgreSQL', () => {
    const schema = `test_customer_${randomUUID().replaceAll('-', '')}`;
    let source: DataSource;

    beforeAll(async () => {
        await createSchema(process.env.TEST_DATABASE_URL!, schema);
        source = new DataSource({
            ...createDataSourceOptions({
                DATABASE_URL: process.env.TEST_DATABASE_URL,
                DATABASE_SCHEMA: schema,
            }),
            migrations: [Initial20260106151610],
        });
        await source.initialize();
        await source.runMigrations();
        await source.query(`SET search_path TO "${schema}"`);
    });
    afterAll(async () => {
        if (source?.isInitialized) {
            await source.destroy();
        }
        await dropSchema(process.env.TEST_DATABASE_URL!, schema);
    });

    it('backfills old rows, encrypts writes, tracks normalized contacts, updates indexes and rolls back', async () => {
        const id = randomUUID();
        await source.query(
            `INSERT INTO orders (id, email, full_name, phone, shipping_address, note, subtotal, shipping_fee, total_amount, updated_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, 100, 0, 100, NOW())`,
            [
                id,
                'Guest@Example.com',
                'Nguyễn An',
                '+84 901-234-567',
                JSON.stringify('123 Test Street'),
                'Private note',
            ],
        );
        await source.destroy();
        source = new DataSource(
            createDataSourceOptions({
                DATABASE_URL: process.env.TEST_DATABASE_URL,
                DATABASE_SCHEMA: schema,
            }),
        );
        await source.initialize();
        await source.runMigrations();
        await source.query(`SET search_path TO "${schema}"`);
        const repository = source.getRepository(OrderEntity);
        const raw = (await source.query('SELECT * FROM orders WHERE id = $1', [id]))[0];
        for (const field of ['email', 'full_name', 'phone', 'shipping_address', 'note']) {
            expect(raw[field]).toMatch(/^enc:v1:/);
        }
        expect(raw.email_lookup).toBe(customerLookup('email', 'guest@example.com'));
        const loaded = await repository.findOneByOrFail({ id });
        expect(loaded.fullName).toBe('Nguyễn An');
        expect(loaded.shippingAddress).toBe('123 Test Street');
        expect(loaded.emailLookup).toBeUndefined();
        const service = new OrderService(
            repository,
            {} as any,
            {} as any,
            source,
            {
                set: jest.fn().mockResolvedValue('OK'),
            } as any,
            {} as any,
        );
        expect((await service.trackGuestOrders({ email: 'guest@example.com' }))[0].id).toBe(id);
        expect((await service.trackGuestOrders({ phone: '0901234567' }))[0].id).toBe(id);
        await repository.update(id, { phone: '0907654321' });
        expect(await service.trackGuestOrders({ phone: '0901234567' })).toEqual([]);
        expect((await service.trackGuestOrders({ phone: '+84 907654321' }))[0].id).toBe(id);
        const created = await repository.save({
            email: 'new@example.com',
            phone: '0901111111',
            fullName: 'New Guest',
            shippingAddress: { street: 'Private street' },
            subtotal: '100',
            shippingFee: '0',
            totalAmount: '100',
        });
        expect((await repository.findOneByOrFail({ id: created.id })).shippingAddress).toEqual({
            street: 'Private street',
        });
        expect(
            (
                await source.query('SELECT email, email_lookup FROM orders WHERE id = $1', [
                    created.id,
                ])
            )[0],
        ).toEqual({
            email: expect.stringMatching(/^enc:v1:/),
            email_lookup: customerLookup('email', 'new@example.com'),
        });
        const original = process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
        try {
            process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'cd'.repeat(32);
            await expect(source.undoLastMigration()).rejects.toThrow();
        } finally {
            process.env.CUSTOMER_DATA_ENCRYPTION_KEY = original;
        }
        expect((await source.query('SELECT email FROM orders WHERE id = $1', [id]))[0].email).toBe(
            raw.email,
        );
        await source.undoLastMigration();
        expect(
            (
                await source.query(
                    'SELECT email, phone, shipping_address FROM orders WHERE id = $1',
                    [id],
                )
            )[0],
        ).toEqual({
            email: 'Guest@Example.com',
            phone: '0907654321',
            shipping_address: '123 Test Street',
        });
    });
});
