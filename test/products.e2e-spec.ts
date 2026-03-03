import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createRedisMock } from './helpers/app-setup';
import { expectApiResponse, expectPaginatedResponse } from './helpers/test-helpers';

describe('Products (e2e)', () => {
    let app: INestApplication;

    const mockVariant = {
        id: 'variant-001',
        productId: 'prod-001',
        sku: 'PROD-001-S',
        price: '99.99',
        stock: 10,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockProduct = {
        id: 'prod-001',
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test description',
        shortDescription: 'Short desc',
        categoryId: 'cat-001',
        productType: 'MERCH',
        status: 'PUBLISHED',
        mediaGallery: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        productVariants: [mockVariant],
        productArtists: [],
        category: { id: 'cat-001', name: 'Merch', slug: 'merch' },
    };

    const prismaMock = {
        product: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn((fn) =>
            typeof fn === 'function' ? fn(prismaMock) : Promise.resolve(fn),
        ),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    beforeAll(async () => {
        const redisMock = createRedisMock();
        ({ app } = await createTestApp(prismaMock, redisMock));
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/products', () => {
        it('should return paginated list of published products', async () => {
            prismaMock.product.findMany.mockResolvedValue([mockProduct]);
            prismaMock.product.count.mockResolvedValue(1);

            const res = await request(app.getHttpServer()).get('/api/products').expect(200);

            expectPaginatedResponse(res);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support page and limit query params', async () => {
            prismaMock.product.findMany.mockResolvedValue([]);
            prismaMock.product.count.mockResolvedValue(0);

            const res = await request(app.getHttpServer())
                .get('/api/products?page=2&limit=5')
                .expect(200);

            expectPaginatedResponse(res);
            expect(res.body.meta.currentPage).toBe(2);
            expect(res.body.meta.limit).toBe(5);
        });

        it('should return empty list when no products exist', async () => {
            prismaMock.product.findMany.mockResolvedValue([]);
            prismaMock.product.count.mockResolvedValue(0);

            const res = await request(app.getHttpServer()).get('/api/products').expect(200);

            expect(res.body.data).toEqual([]);
            expect(res.body.meta.totalItems).toBe(0);
        });
    });

    describe('GET /api/products/:slug', () => {
        it('should return product detail by slug', async () => {
            prismaMock.product.findFirst.mockResolvedValue(mockProduct);

            const res = await request(app.getHttpServer())
                .get('/api/products/test-product')
                .expect(200);

            expectApiResponse(res);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('slug');
        });

        it('should return 404 when product does not exist', async () => {
            prismaMock.product.findFirst.mockResolvedValue(null);

            await request(app.getHttpServer()).get('/api/products/non-existent-slug').expect(404);
        });
    });
});
