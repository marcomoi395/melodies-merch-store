import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsAdminController } from './artists.admin.controller';
import { ArtistsService } from '../artists.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ArtistsAdminController', () => {
    let controller: ArtistsAdminController;
    let service: ArtistsService;

    const mockArtist = {
        id: 'artist_123',
        stageName: 'Test Artist',
        slug: 'test-artist',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test artist bio',
    };

    const mockArtistsService = {
        createArtistForAdmin: jest.fn(),
        updateArtistForAdmin: jest.fn(),
        deleteArtistForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ArtistsAdminController],
            providers: [
                {
                    provide: ArtistsService,
                    useValue: mockArtistsService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ArtistsAdminController>(ArtistsAdminController);
        service = module.get<ArtistsService>(ArtistsService);

        jest.clearAllMocks();
    });

    describe('createNewArtistForAdmin', () => {
        it('should create a new artist', async () => {
            const createDto = {
                stageName: 'New Artist',
                bio: 'New artist bio',
                avatarUrl: 'https://example.com/new-avatar.jpg',
            };

            mockArtistsService.createArtistForAdmin.mockResolvedValue(mockArtist);

            const result = await controller.createNewArtistForAdmin(createDto);

            expect(service.createArtistForAdmin).toHaveBeenCalledWith(createDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Artist created successfully',
                data: expect.anything(),
            });
        });

        it('should transform data correctly (exclude secret fields)', async () => {
            const createDto = {
                stageName: 'New Artist',
                bio: 'New artist bio',
                avatarUrl: 'https://example.com/new-avatar.jpg',
            };

            const rawArtist = {
                ...mockArtist,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };

            mockArtistsService.createArtistForAdmin.mockResolvedValue(rawArtist);

            const result = await controller.createNewArtistForAdmin(createDto);

            expect(result.data).toEqual({
                id: mockArtist.id,
                stageName: mockArtist.stageName,
                slug: mockArtist.slug,
                bio: mockArtist.bio,
                avatarUrl: mockArtist.avatarUrl,
                metadata: {},
                products: undefined,
            });
            expect(result.data).not.toHaveProperty('status');
            expect(result.data).not.toHaveProperty('createdAt');
            expect(result.data).not.toHaveProperty('updatedAt');
            expect(result.data).not.toHaveProperty('deletedAt');
        });

        it('should throw ConflictException when artist with same stage name already exists', async () => {
            const createDto = {
                stageName: 'Test Artist',
                bio: 'Test artist bio',
                avatarUrl: 'https://example.com/avatar.jpg',
            };

            mockArtistsService.createArtistForAdmin.mockRejectedValue(
                new ConflictException('Artist with this stage name already exists'),
            );

            await expect(controller.createNewArtistForAdmin(createDto)).rejects.toThrow(
                ConflictException,
            );

            expect(service.createArtistForAdmin).toHaveBeenCalledWith(createDto);
        });
    });

    describe('updateArtistForAdmin', () => {
        it('should update an artist', async () => {
            const updateDto = {
                stageName: 'Updated Artist',
            };

            const updatedArtist = {
                ...mockArtist,
                stageName: updateDto.stageName,
            };

            mockArtistsService.updateArtistForAdmin.mockResolvedValue(updatedArtist);

            const result = await controller.updateArtistForAdmin(updateDto, 'artist_123');

            expect(service.updateArtistForAdmin).toHaveBeenCalledWith('artist_123', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Artist updated successfully',
                data: expect.anything(),
            });
        });

        it('should throw NotFoundException when artist is not found', async () => {
            const updateDto = { stageName: 'Updated Artist' };

            mockArtistsService.updateArtistForAdmin.mockRejectedValue(
                new NotFoundException('Artist with ID non_existent_id not found'),
            );

            await expect(
                controller.updateArtistForAdmin(updateDto, 'non_existent_id'),
            ).rejects.toThrow(NotFoundException);
            expect(service.updateArtistForAdmin).toHaveBeenCalledWith('non_existent_id', updateDto);
        });

        it('should throw ConflictException when stage name already exists', async () => {
            const updateDto = { stageName: 'Existing Artist' };

            mockArtistsService.updateArtistForAdmin.mockRejectedValue(
                new ConflictException('Artist with this stage name already exists'),
            );

            await expect(controller.updateArtistForAdmin(updateDto, 'artist_123')).rejects.toThrow(
                ConflictException,
            );
            expect(service.updateArtistForAdmin).toHaveBeenCalledWith('artist_123', updateDto);
        });
    });

    describe('deleteArtistForAdmin', () => {
        it('should delete an artist', async () => {
            mockArtistsService.deleteArtistForAdmin.mockResolvedValue(undefined);

            const result = await controller.deleteArtistForAdmin('artist_123');

            expect(service.deleteArtistForAdmin).toHaveBeenCalledWith('artist_123');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Artist deleted successfully',
            });
        });

        it('should throw NotFoundException when artist is not found', async () => {
            mockArtistsService.deleteArtistForAdmin.mockRejectedValue(
                new NotFoundException('Artist not found'),
            );

            await expect(controller.deleteArtistForAdmin('non_existent_id')).rejects.toThrow(
                NotFoundException,
            );
            expect(service.deleteArtistForAdmin).toHaveBeenCalledWith('non_existent_id');
        });
    });
});
