import { RolesService } from './roles.service';

describe('RolesService', () => {
    it('loads non-deleted roles with permissions', async () => {
        const roles = {
            find: jest.fn().mockResolvedValue([{ id: 'r1', name: 'Admin', rolePermissions: [] }]),
        };
        const result = await new RolesService(roles as any, {} as any, {} as any).getRoles();
        expect(result).toEqual([{ id: 'r1', name: 'Admin', permissions: [] }]);
    });
});
