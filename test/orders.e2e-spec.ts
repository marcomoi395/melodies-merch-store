import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createRedisMock, generateTestToken } from './helpers/app-setup';
import { authHeader, expectApiResponse } from './helpers/test-helpers';

describe('Orders (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;

    const USER_ID = 'user-e2e-001';
    const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';
    const VARIANT_ID = '660e8400-e29b-41d4-a716-446655440000';

    const mockOrderItem = {
        id: 'orderitem-001',
        orderId: ORDER_ID,
        productVariantId: VARIANT_ID,
        quantity: 2,
        unitPrice: '99.99',
        subtotal: '199.98',
        productVariant: {
            id: VARIANT_ID,
            sku: 'PROD-001-S',
            product: { id: 'prod-001', name: 'Test Product', mediaGallery: [] },
        },
    };

    const mockOrder = {
        id: ORDER_ID,
        userId: USER_ID,
        status: 'PENDING',
        totalAmount: '199.98',
        shippingAddress: '123 Test St',
        paymentMethod: 'COD',
        fullName: 'Test User',
        email: 'user@example.com',
        phone: '0123456789',
        note: null,
        appliedVoucher: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderItems: [mockOrderItem],
        promotion: null,
    };

    const validCreateOrderPayload = {
        fullName: 'Test User',
        email: 'user@example.com',
        phone: '0123456789',
        shippingAddress: '123 Test Street, City',
        paymentMethod: 'COD',
        items: [{ productVariantId: VARIANT_ID, quantity: 2 }],
    };

    const prismaMock = {
        order: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        orderItem: {
            findFirst: jest.fn(),
            createMany: jest.fn(),
        },
        productVariant: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        promotion: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((fn) =>
            typeof fn === 'function' ? fn(prismaMock) : Promise.resolve(fn),
        ),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    beforeAll(async () => {
        const redisMock = createRedisMock();
        let jwtSecret: string;
        ({ app, jwtSecret } = await createTestApp(prismaMock, redisMock));
        accessToken = generateTestToken(USER_ID, 'user@example.com', jwtSecret);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/order', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer()).get('/api/order').expect(401);
        });

        it('should return paginated orders for authenticated user', async () => {
            prismaMock.order.findMany.mockResolvedValue([mockOrder]);
            prismaMock.order.count.mockResolvedValue(1);

            const res = await request(app.getHttpServer())
                .get('/api/order')
                .set(authHeader(accessToken))
                .expect(200);

            expect(res.body).toHaveProperty('statusCode', 200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('meta');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.meta).toHaveProperty('total');
            expect(res.body.meta).toHaveProperty('page');
            expect(res.body.meta).toHaveProperty('limit');
        });

        it('should return empty list when user has no orders', async () => {
            prismaMock.order.findMany.mockResolvedValue([]);
            prismaMock.order.count.mockResolvedValue(0);

            const res = await request(app.getHttpServer())
                .get('/api/order')
                .set(authHeader(accessToken))
                .expect(200);

            expect(res.body.data).toEqual([]);
            expect(res.body.meta.total).toBe(0);
        });
    });

    describe('GET /api/order/:id', () => {
        it('should return order detail by ID', async () => {
            prismaMock.order.findUnique.mockResolvedValue(mockOrder);

            const res = await request(app.getHttpServer())
                .get(`/api/order/${ORDER_ID}`)
                .expect(200);

            expectApiResponse(res);
            expect(res.body.data).toHaveProperty('id');
        });

        it('should return 400 for invalid UUID format', async () => {
            await request(app.getHttpServer()).get('/api/order/not-a-uuid').expect(400);
        });

        it('should return 200 with null data when order does not exist', async () => {
            prismaMock.order.findUnique.mockResolvedValue(null);

            const res = await request(app.getHttpServer())
                .get(`/api/order/${ORDER_ID}`)
                .expect(200);

            expect(res.body.statusCode).toBe(200);
        });
    });

    describe('POST /api/order', () => {
        it('should return 400 for missing required fields', async () => {
            await request(app.getHttpServer()).post('/api/order').send({}).expect(400);
        });

        it('should return 400 for invalid payment method', async () => {
            await request(app.getHttpServer())
                .post('/api/order')
                .send({ ...validCreateOrderPayload, paymentMethod: 'INVALID' })
                .expect(400);
        });
    });

    describe('PATCH /api/order/:id (cancel)', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer()).patch(`/api/order/${ORDER_ID}`).expect(401);
        });

        it('should return 400 for invalid UUID format', async () => {
            await request(app.getHttpServer())
                .patch('/api/order/not-a-uuid')
                .set(authHeader(accessToken))
                .expect(400);
        });
    });
});
