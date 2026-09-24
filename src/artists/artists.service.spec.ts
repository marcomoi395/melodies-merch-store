import { NotFoundException } from '@nestjs/common';
import { ArtistsService } from './artists.service';

describe('ArtistsService', () => {
    it('paginates through the TypeORM repository', async () => {
        const artists = {
            count: jest.fn().mockResolvedValue(1),
            find: jest.fn().mockResolvedValue([{ id: 'a1' }]),
        };
        const service = new ArtistsService(artists as any, {} as any);
        await expect(service.getArtists({ page: 2, limit: 10 })).resolves.toEqual({
            data: [{ id: 'a1' }],
            meta: { currentPage: 2, totalPages: 1, limit: 10, totalItems: 1 },
        });
        expect(artists.find).toHaveBeenCalled();
    });

    it('translates a missing artist to NotFoundException', async () => {
        const service = new ArtistsService(
            { findOne: jest.fn().mockResolvedValue(null) } as any,
            {} as any,
        );
        await expect(service.getArtistDetail('missing')).rejects.toThrow(NotFoundException);
    });
});
