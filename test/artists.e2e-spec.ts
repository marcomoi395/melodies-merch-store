import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createRedisMock } from './helpers/app-setup';
import { expectApiResponse, expectPaginatedResponse } from './helpers/test-helpers';

describe('Artists (e2e)', () => {
    let app: INestApplication;

    const mockArtist = {
        id: 'artist-001',
        stageName: 'Test Artist',
        slug: 'test-artist',
        bio: 'A great test artist',
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        productArtists: [],
    };

    const prismaMock = {
        artist: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
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

    describe('GET /api/artists', () => {
        it('should return paginated list of artists', async () => {
            prismaMock.artist.findMany.mockResolvedValue([mockArtist]);
            prismaMock.artist.count.mockResolvedValue(1);

            const res = await request(app.getHttpServer()).get('/api/artists').expect(200);

            expectPaginatedResponse(res);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support page and limit query params', async () => {
            prismaMock.artist.findMany.mockResolvedValue([]);
            prismaMock.artist.count.mockResolvedValue(0);

            const res = await request(app.getHttpServer())
                .get('/api/artists?page=1&limit=5')
                .expect(200);

            expectPaginatedResponse(res);
            expect(res.body.meta.limit).toBe(5);
        });

        it('should return empty list when no artists exist', async () => {
            prismaMock.artist.findMany.mockResolvedValue([]);
            prismaMock.artist.count.mockResolvedValue(0);

            const res = await request(app.getHttpServer()).get('/api/artists').expect(200);

            expect(res.body.data).toEqual([]);
            expect(res.body.meta.totalItems).toBe(0);
        });
    });

    describe('GET /api/artists/:slug', () => {
        it('should return artist detail by slug', async () => {
            prismaMock.artist.findUnique.mockResolvedValue(mockArtist);

            const res = await request(app.getHttpServer())
                .get('/api/artists/test-artist')
                .expect(200);

            expectApiResponse(res);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('slug');
            expect(res.body.data).toHaveProperty('stageName');
        });

        it('should return 404 when artist does not exist', async () => {
            prismaMock.artist.findUnique.mockResolvedValue(null);

            await request(app.getHttpServer()).get('/api/artists/non-existent-artist').expect(404);
        });
    });
});
