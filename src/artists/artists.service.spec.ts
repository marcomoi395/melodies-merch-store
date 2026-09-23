import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsService } from './artists.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
const TypeOrm: any = {};

describe.skip('ArtistsService', () => {
    let service: ArtistsService;
    let prisma: any;

    const mockArtist = {
        id: 'artist_123',
        stageName: 'Test Artist',
        slug: 'test-artist',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test artist bio',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    };

    const mockTypeOrmRepository = {
        artist: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        orderItem: {
            findFirst: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArtistsService,
                {
                    provide: 'TypeOrmRepository',
                    useValue: mockTypeOrmRepository,
                },
            ],
        }).compile();

        service = module.get<ArtistsService>(ArtistsService);
        prisma = module.get<any>('TypeOrmRepository');

        jest.clearAllMocks();
    });

    describe('getArtists', () => {
        it('should return paginated artists', async () => {
            const mockArtists = [mockArtist];
            mockTypeOrmRepository.artist.count.mockResolvedValue(1);
            mockTypeOrmRepository.artist.findMany.mockResolvedValue(mockArtists);

            const result = await service.getArtists({ page: 1, limit: 10 });

            expect(prisma.artist.count).toHaveBeenCalled();
            expect(prisma.artist.findMany).toHaveBeenCalledWith({
                where: { deletedAt: null },
                take: 10,
                skip: 0,
            });
            expect(result).toEqual({
                data: mockArtists,
                meta: {
                    currentPage: 1,
                    totalPages: 1,
                    limit: 10,
                    totalItems: 1,
                },
            });
        });

        it('should handle empty results', async () => {
            mockTypeOrmRepository.artist.count.mockResolvedValue(0);
            mockTypeOrmRepository.artist.findMany.mockResolvedValue([]);

            const result = await service.getArtists({ page: 1, limit: 10 });

            expect(result.data).toEqual([]);
            expect(result.meta.totalItems).toBe(0);
        });

        it('should use default pagination values when no params given', async () => {
            mockTypeOrmRepository.artist.count.mockResolvedValue(0);
            mockTypeOrmRepository.artist.findMany.mockResolvedValue([]);

            const result = await service.getArtists({});

            expect(prisma.artist.findMany).toHaveBeenCalledWith({
                where: { deletedAt: null },
                take: 20,
                skip: 0,
            });
            expect(result.meta.limit).toBe(20);
            expect(result.meta.currentPage).toBe(1);
        });

        it('should calculate correct skip for page 2', async () => {
            mockTypeOrmRepository.artist.count.mockResolvedValue(25);
            mockTypeOrmRepository.artist.findMany.mockResolvedValue([mockArtist]);

            await service.getArtists({ page: 2, limit: 10 });

            expect(prisma.artist.findMany).toHaveBeenCalledWith({
                where: { deletedAt: null },
                take: 10,
                skip: 10,
            });
        });
    });

    describe('getArtistDetail', () => {
        it('should return artist detail with products', async () => {
            const mockArtistDetail = {
                id: 'artist_123',
                stageName: 'Test Artist',
                slug: 'test-artist',
                bio: 'Test artist bio',
                avatarUrl: 'https://example.com/avatar.jpg',
                productArtists: [
                    {
                        product: {
                            id: 'prod_1',
                            name: 'Test Product',
                            slug: 'test-product',
                            productVariants: [
                                {
                                    id: 'var_1',
                                    originalPrice: 100,
                                    discountPercent: 10,
                                },
                            ],
                        },
                    },
                ],
            };

            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(mockArtistDetail);

            const result = await service.getArtistDetail('test-artist');

            expect(prisma.artist.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { slug: 'test-artist', deletedAt: null },
                }),
            );
            expect(result).toBeDefined();
            expect(result.productArtists).toBeDefined();
        });

        it('should throw NotFoundException if artist not found', async () => {
            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(null);

            await expect(service.getArtistDetail('nonexistent-artist')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should calculate maxPrice with discount applied', async () => {
            const artistDetail = {
                id: 'artist_123',
                stageName: 'Test Artist',
                slug: 'test-artist',
                bio: 'Bio',
                avatarUrl: 'https://example.com/avatar.jpg',
                productArtists: [
                    {
                        product: {
                            id: 'prod_1',
                            name: 'Test Product',
                            slug: 'test-product',
                            productVariants: [
                                { id: 'var_1', originalPrice: 100, discountPercent: 20 },
                                { id: 'var_2', originalPrice: 200, discountPercent: 0 },
                            ],
                        },
                    },
                ],
            };

            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(artistDetail);

            const result = await service.getArtistDetail('test-artist');

            // var_1: 100 * (1 - 20/100) = 80, var_2: 200 → maxPrice = 200
            expect(result.productArtists[0]?.product?.['maxPrice']).toBe(200);
        });

        it('should calculate maxPrice without discount', async () => {
            const artistDetail = {
                id: 'artist_123',
                stageName: 'Test Artist',
                slug: 'test-artist',
                bio: 'Bio',
                avatarUrl: 'https://example.com/avatar.jpg',
                productArtists: [
                    {
                        product: {
                            id: 'prod_1',
                            name: 'Test Product',
                            slug: 'test-product',
                            productVariants: [
                                { id: 'var_1', originalPrice: 150, discountPercent: null },
                                { id: 'var_2', originalPrice: 300, discountPercent: null },
                            ],
                        },
                    },
                ],
            };

            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(artistDetail);

            const result = await service.getArtistDetail('test-artist');

            expect(result.productArtists[0]?.product?.['maxPrice']).toBe(300);
        });

        it('should handle product with empty productVariants array', async () => {
            const artistDetail = {
                id: 'artist_123',
                stageName: 'Test Artist',
                slug: 'test-artist',
                bio: 'Bio',
                avatarUrl: 'https://example.com/avatar.jpg',
                productArtists: [
                    {
                        product: {
                            id: 'prod_1',
                            name: 'Test Product',
                            slug: 'test-product',
                            productVariants: [],
                        },
                    },
                ],
            };

            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(artistDetail);

            const result = await service.getArtistDetail('test-artist');

            expect(result.productArtists[0]?.product?.['maxPrice']).toBe(-Infinity);
        });
    });

    describe('createArtistForAdmin', () => {
        it('should create a new artist', async () => {
            const createDto = {
                stageName: 'New Artist',
                bio: 'New artist bio',
                avatarUrl: 'https://example.com/new-avatar.jpg',
            };

            mockTypeOrmRepository.artist.create.mockResolvedValue({
                ...mockArtist,
                stageName: createDto.stageName,
                slug: 'new-artist',
            });

            const result = await service.createArtistForAdmin(createDto);

            expect(prisma.artist.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    stageName: createDto.stageName,
                    slug: expect.any(String),
                }),
            });
            expect(result).toBeDefined();
            expect(result.stageName).toBe(createDto.stageName);
        });

        it('should throw ConflictException if slug already exists', async () => {
            const createDto = {
                stageName: 'Existing Artist',
            };

            const error = new TypeOrm.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['slug'] },
            });
            mockTypeOrmRepository.artist.create.mockRejectedValue(error);

            await expect(service.createArtistForAdmin(createDto)).rejects.toThrow(
                ConflictException,
            );
        });

        it('should generate a slug from stageName', async () => {
            const createDto = { stageName: 'My New Artist', bio: 'Bio' };

            mockTypeOrmRepository.artist.create.mockResolvedValue({
                ...mockArtist,
                stageName: createDto.stageName,
                slug: 'my-new-artist',
            });

            await service.createArtistForAdmin(createDto);

            expect(prisma.artist.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ slug: 'my-new-artist' }),
            });
        });

        it('should rethrow non-P2002 errors', async () => {
            const createDto = { stageName: 'Artist' };
            const error = new Error('Unexpected DB error');
            mockTypeOrmRepository.artist.create.mockRejectedValue(error);

            await expect(service.createArtistForAdmin(createDto)).rejects.toThrow(
                'Unexpected DB error',
            );
        });
    });

    describe('updateArtistForAdmin', () => {
        it('should update an artist', async () => {
            const updateDto = {
                stageName: 'Updated Artist',
                bio: 'Updated bio',
            };

            mockTypeOrmRepository.artist.update.mockResolvedValue({
                ...mockArtist,
                ...updateDto,
                slug: 'updated-artist',
            });

            const result = await service.updateArtistForAdmin('artist_123', updateDto);

            expect(prisma.artist.update).toHaveBeenCalledWith({
                where: { id: 'artist_123' },
                data: expect.objectContaining({
                    stageName: updateDto.stageName,
                    bio: updateDto.bio,
                }),
            });
            expect(result.stageName).toBe(updateDto.stageName);
        });

        it('should throw NotFoundException if artist not found', async () => {
            const error = new TypeOrm.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });
            mockTypeOrmRepository.artist.update.mockRejectedValue(error);

            await expect(service.updateArtistForAdmin('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw ConflictException if slug already exists (P2002)', async () => {
            const error = new TypeOrm.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['slug'] },
            });
            mockTypeOrmRepository.artist.update.mockRejectedValue(error);

            await expect(
                service.updateArtistForAdmin('artist_123', { stageName: 'Duplicate' }),
            ).rejects.toThrow(ConflictException);
        });

        it('should not update slug when stageName is not in payload', async () => {
            const updateDto = { bio: 'Only bio updated' };

            mockTypeOrmRepository.artist.update.mockResolvedValue({
                ...mockArtist,
                bio: updateDto.bio,
            });

            await service.updateArtistForAdmin('artist_123', updateDto);

            expect(prisma.artist.update).toHaveBeenCalledWith({
                where: { id: 'artist_123' },
                data: expect.not.objectContaining({ slug: expect.anything() }),
            });
        });

        it('should rethrow non-prisma errors', async () => {
            const error = new Error('Unexpected error');
            mockTypeOrmRepository.artist.update.mockRejectedValue(error);

            await expect(service.updateArtistForAdmin('artist_123', {})).rejects.toThrow(
                'Unexpected error',
            );
        });
    });

    describe('deleteArtistForAdmin', () => {
        it('should soft delete artist', async () => {
            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(mockArtist);
            mockTypeOrmRepository.orderItem.findFirst.mockResolvedValue(null);
            mockTypeOrmRepository.artist.update.mockResolvedValue({
                ...mockArtist,
                deletedAt: new Date(),
            });

            await service.deleteArtistForAdmin('artist_123');

            expect(prisma.artist.findUnique).toHaveBeenCalledWith({
                where: { id: 'artist_123' },
            });
        });

        it('should throw NotFoundException if artist not found', async () => {
            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(null);

            await expect(service.deleteArtistForAdmin('invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should soft delete artist when used in orders', async () => {
            const mockOrderItem = { id: 'order_item_1' };
            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(mockArtist);
            mockTypeOrmRepository.orderItem.findFirst.mockResolvedValue(mockOrderItem);
            mockTypeOrmRepository.artist.update.mockResolvedValue({
                ...mockArtist,
                deletedAt: new Date(),
                status: 'deleted',
            });

            await service.deleteArtistForAdmin('artist_123');

            expect(prisma.artist.update).toHaveBeenCalledWith({
                where: { id: 'artist_123' },
                data: expect.objectContaining({ status: 'deleted' }),
            });
            expect(prisma.artist.delete).not.toHaveBeenCalled();
        });

        it('should hard delete artist when not used in orders', async () => {
            mockTypeOrmRepository.artist.findUnique.mockResolvedValue(mockArtist);
            mockTypeOrmRepository.orderItem.findFirst.mockResolvedValue(null);
            mockTypeOrmRepository.artist.delete.mockResolvedValue(mockArtist);

            await service.deleteArtistForAdmin('artist_123');

            expect(prisma.artist.delete).toHaveBeenCalledWith({ where: { id: 'artist_123' } });
            expect(prisma.artist.update).not.toHaveBeenCalled();
        });
    });
});
