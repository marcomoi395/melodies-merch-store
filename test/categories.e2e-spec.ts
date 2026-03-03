import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createRedisMock } from './helpers/app-setup';
import { expectApiResponse, expectPaginatedResponse } from './helpers/test-helpers';

describe('Categories (e2e)', () => {
    let app: INestApplication;

    const mockCategory = {
        id: 'cat-001',
        name: 'Music',
        slug: 'music',
        description: 'Music merchandise',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockProduct = {
        id: 'prod-001',
        name: 'Test Album',
        slug: 'test-album',
        shortDescription: 'A test album',
        productType: 'MUSIC',
        status: 'published',
        minPrice: '59.99',
        mediaGallery: [],
        productVariants: [],
        productArtists: [],
    };

    const prismaMock = {
        category: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
        },
        product: {
            findMany: jest.fn(),
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

    describe('GET /api/categories', () => {
        it('should return category tree', async () => {
            prismaMock.category.findMany.mockResolvedValue([mockCategory]);

            const res = await request(app.getHttpServer()).get('/api/categories').expect(200);

            expectApiResponse(res);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return empty array when no categories exist', async () => {
            prismaMock.category.findMany.mockResolvedValue([]);

            const res = await request(app.getHttpServer()).get('/api/categories').expect(200);

            expect(res.body.data).toEqual([]);
        });
    });

    describe('GET /api/categories/:slug', () => {
        it('should return products for a valid category slug', async () => {
            prismaMock.product.findMany.mockResolvedValue([mockProduct]);
            prismaMock.product.count.mockResolvedValue(1);

            const res = await request(app.getHttpServer()).get('/api/categories/music').expect(200);

            expectPaginatedResponse(res);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support pagination query params', async () => {
            prismaMock.product.findMany.mockResolvedValue([mockProduct]);
            prismaMock.product.count.mockResolvedValue(1);

            const res = await request(app.getHttpServer())
                .get('/api/categories/music?page=1&limit=5')
                .expect(200);

            expectPaginatedResponse(res);
        });

        it('should return 404 when category has no products', async () => {
            prismaMock.product.findMany.mockResolvedValue([]);
            prismaMock.product.count.mockResolvedValue(0);

            await request(app.getHttpServer()).get('/api/categories/empty-category').expect(404);
        });
    });
});
