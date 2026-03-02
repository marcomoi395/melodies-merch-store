import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsPublicController } from './artists.public.controller';
import { ArtistsService } from '../artists.service';
import { NotFoundException } from '@nestjs/common';

describe('ArtistsPublicController', () => {
    let controller: ArtistsPublicController;
    let service: ArtistsService;

    const mockArtist = {
        id: 'artist_123',
        stageName: 'Test Artist',
        slug: 'test-artist',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test artist bio',
    };

    const mockArtistsService = {
        getArtists: jest.fn(),
        getArtistDetail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ArtistsPublicController],
            providers: [
                {
                    provide: ArtistsService,
                    useValue: mockArtistsService,
                },
            ],
        }).compile();

        controller = module.get<ArtistsPublicController>(ArtistsPublicController);
        service = module.get<ArtistsService>(ArtistsService);

        jest.clearAllMocks();
    });

    describe('getArtists', () => {
        it('should return paginated artists', async () => {
            const mockResult = {
                data: [mockArtist],
                meta: {
                    currentPage: 1,
                    totalPages: 1,
                    limit: 10,
                    totalItems: 1,
                },
            };

            mockArtistsService.getArtists.mockResolvedValue(mockResult);

            const result = await controller.getArtists({ page: 1, limit: 10 });

            expect(service.getArtists).toHaveBeenCalledWith({ page: 1, limit: 10 });
            expect(result).toEqual({
                statusCode: 200,
                message: 'Artists fetched successfully',
                data: expect.any(Array),
                meta: mockResult.meta,
            });
        });

        it('should transform data correctly (exclude secret fields)', async () => {
            const rawArtists = [
                {
                    ...mockArtist,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                },
            ];

            mockArtistsService.getArtists.mockResolvedValue({
                data: rawArtists,
                meta: { currentPage: 1, totalPages: 1, limit: 10, totalItems: 1 },
            });

            const result = await controller.getArtists({ page: 1, limit: 10 });

            expect(result.data[0]).toEqual({
                id: mockArtist.id,
                stageName: mockArtist.stageName,
                slug: mockArtist.slug,
                bio: mockArtist.bio,
                avatarUrl: mockArtist.avatarUrl,
                metadata: {},
                products: undefined,
            });
            expect(result.data[0]).not.toHaveProperty('status');
            expect(result.data[0]).not.toHaveProperty('createdAt');
            expect(result.data[0]).not.toHaveProperty('updatedAt');
            expect(result.data[0]).not.toHaveProperty('deletedAt');
        });

        it('should return empty list when no artists exist', async () => {
            mockArtistsService.getArtists.mockResolvedValue({
                data: [],
                meta: { currentPage: 1, totalPages: 0, limit: 10, totalItems: 0 },
            });

            const result = await controller.getArtists({ page: 1, limit: 10 });

            expect(result.data).toEqual([]);
            expect(result.meta.totalItems).toBe(0);
        });

        it('should pass correct page and limit to service', async () => {
            mockArtistsService.getArtists.mockResolvedValue({
                data: [],
                meta: { currentPage: 3, totalPages: 5, limit: 5, totalItems: 25 },
            });

            await controller.getArtists({ page: 3, limit: 5 });

            expect(service.getArtists).toHaveBeenCalledWith({ page: 3, limit: 5 });
        });

        it('should return correct meta for multi-page results', async () => {
            const artists = Array.from({ length: 5 }, (_, i) => ({
                ...mockArtist,
                id: `artist_${i + 1}`,
            }));

            mockArtistsService.getArtists.mockResolvedValue({
                data: artists,
                meta: { currentPage: 2, totalPages: 4, limit: 5, totalItems: 20 },
            });

            const result = await controller.getArtists({ page: 2, limit: 5 });

            expect(result.meta).toEqual({
                currentPage: 2,
                totalPages: 4,
                limit: 5,
                totalItems: 20,
            });
            expect(result.data).toHaveLength(5);
        });

        it('should use service defaults when no pagination params provided', async () => {
            mockArtistsService.getArtists.mockResolvedValue({
                data: [mockArtist],
                meta: { currentPage: 1, totalPages: 1, limit: 20, totalItems: 1 },
            });

            await controller.getArtists({});

            expect(service.getArtists).toHaveBeenCalledWith({});
            expect(service.getArtists).toHaveBeenCalledTimes(1);
        });
    });

    describe('getArtistDetail', () => {
        it('should return artist detail', async () => {
            const mockArtistDetail = {
                ...mockArtist,
                productArtists: [],
            };

            mockArtistsService.getArtistDetail.mockResolvedValue(mockArtistDetail);

            const result = await controller.getArtistDetail({ slug: 'test-artist' });

            expect(service.getArtistDetail).toHaveBeenCalledWith('test-artist');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Artist detail fetched successfully',
                data: expect.anything(),
            });
        });

        it('should transform data correctly (exclude secret fields)', async () => {
            const rawArtistDetail = {
                ...mockArtist,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                productArtists: [],
            };

            mockArtistsService.getArtistDetail.mockResolvedValue(rawArtistDetail);

            const result = await controller.getArtistDetail({ slug: 'test-artist' });

            expect(result.data).toEqual({
                id: mockArtist.id,
                stageName: mockArtist.stageName,
                slug: mockArtist.slug,
                bio: mockArtist.bio,
                avatarUrl: mockArtist.avatarUrl,
                metadata: {},
                products: [],
            });
            expect(result.data).not.toHaveProperty('status');
            expect(result.data).not.toHaveProperty('createdAt');
            expect(result.data).not.toHaveProperty('updatedAt');
            expect(result.data).not.toHaveProperty('deletedAt');
            expect(result.data).not.toHaveProperty('productArtists');
        });

        it('should throw NotFoundException when artist is not found', async () => {
            mockArtistsService.getArtistDetail.mockRejectedValue(
                new NotFoundException('Artist not found'),
            );

            await expect(
                controller.getArtistDetail({ slug: 'non-existent-artist' }),
            ).rejects.toThrow(NotFoundException);
            expect(service.getArtistDetail).toHaveBeenCalledWith('non-existent-artist');
        });
    });
});
