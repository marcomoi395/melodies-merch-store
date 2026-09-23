import { NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
    it('returns ordered permissions', async () => {
        const permissions = { find: jest.fn().mockResolvedValue([{ id: 'p1' }]) };
        await expect(new PermissionsService(permissions as any).getPermisisons()).resolves.toEqual([
            { id: 'p1' },
        ]);
    });

    it('rejects an empty permission table', async () => {
        const service = new PermissionsService({ find: jest.fn().mockResolvedValue([]) } as any);
        await expect(service.getPermisisons()).rejects.toThrow(NotFoundException);
    });
});
