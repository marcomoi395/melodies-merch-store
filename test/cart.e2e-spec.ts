import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createRedisMock, generateTestToken } from './helpers/app-setup';
import { authHeader, expectApiResponse } from './helpers/test-helpers';

describe.skip('Cart (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;

    const USER_ID = 'user-e2e-001';
    const CART_ITEM_ID = '550e8400-e29b-41d4-a716-446655440001';
    const VARIANT_ID = '550e8400-e29b-41d4-a716-446655440002';
    const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440003';

    const mockCart = {
        id: 'cart-001',
        userId: USER_ID,
        cartItems: [],
    };

    const repositoryMock = {
        cart: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
        },
        cartItem: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
        },
        productVariant: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((fn) =>
            typeof fn === 'function' ? fn(repositoryMock) : Promise.resolve(fn),
        ),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    beforeAll(async () => {
        const redisMock = createRedisMock();
        let jwtSecret: string;
        ({ app, jwtSecret } = await createTestApp(repositoryMock, redisMock));
        accessToken = generateTestToken(USER_ID, 'user@example.com', jwtSecret);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/cart', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer()).get('/api/cart').expect(401);
        });

        it('should return cart for authenticated user', async () => {
            repositoryMock.cart.findFirst.mockResolvedValue(mockCart);

            const res = await request(app.getHttpServer())
                .get('/api/cart')
                .set(authHeader(accessToken))
                .expect(200);

            expectApiResponse(res);
        });

        it('should create and return new cart when user has no cart', async () => {
            repositoryMock.cart.findFirst.mockResolvedValue(null);
            repositoryMock.cart.create.mockResolvedValue(mockCart);

            const res = await request(app.getHttpServer())
                .get('/api/cart')
                .set(authHeader(accessToken))
                .expect(200);

            expectApiResponse(res);
        });
    });

    describe('POST /api/cart', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer())
                .post('/api/cart')
                .send({ productId: PRODUCT_ID, productVariantId: VARIANT_ID, quantity: 1 })
                .expect(401);
        });

        it('should return 400 for missing required fields', async () => {
            await request(app.getHttpServer())
                .post('/api/cart')
                .set(authHeader(accessToken))
                .send({})
                .expect(400);
        });

        it('should add item to cart', async () => {
            // $transaction calls fn with repositoryMock as tx
            repositoryMock.cart.upsert.mockResolvedValue({ id: 'cart-001', userId: USER_ID });
            repositoryMock.productVariant.findUnique.mockResolvedValue({
                id: VARIANT_ID,
                stockQuantity: 10,
            });
            repositoryMock.cartItem.findFirst.mockResolvedValue(null);
            repositoryMock.cartItem.upsert.mockResolvedValue({
                id: CART_ITEM_ID,
                cartId: 'cart-001',
                productVariantId: VARIANT_ID,
                quantity: 1,
            });
            // getCart called after transaction
            repositoryMock.cart.findFirst.mockResolvedValue(mockCart);

            const res = await request(app.getHttpServer())
                .post('/api/cart')
                .set(authHeader(accessToken))
                .send({ productId: PRODUCT_ID, productVariantId: VARIANT_ID, quantity: 1 })
                .expect(201);

            expectApiResponse(res, 201);
        });
    });

    describe('PATCH /api/cart/:cartItemId', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer())
                .patch(`/api/cart/${CART_ITEM_ID}`)
                .send({ quantity: 3 })
                .expect(401);
        });
    });

    describe('DELETE /api/cart/:cartItemId', () => {
        it('should return 401 without auth token', async () => {
            await request(app.getHttpServer()).delete(`/api/cart/${CART_ITEM_ID}`).expect(401);
        });
    });
});
