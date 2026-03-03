import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from 'src/permissions/permissions.guard';

describe('RolesController', () => {
    let controller: RolesController;
    let service: RolesService;

    const mockRole = {
        id: 'role_1',
        name: 'Admin',
        description: 'Administrator role',
        permissions: [
            {
                id: 'perm_1',
                resource: 'PRODUCT',
                action: 'MANAGE',
            },
        ],
    };

    const mockRolesService = {
        getRoles: jest.fn(),
        createNewRoleForAdmin: jest.fn(),
        updateRoleForAdmin: jest.fn(),
        deleteRoleForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RolesController],
            providers: [
                {
                    provide: RolesService,
                    useValue: mockRolesService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<RolesController>(RolesController);
        service = module.get<RolesService>(RolesService);

        jest.clearAllMocks();
    });

    describe('getRoles', () => {
        it('should return all roles', async () => {
            const mockRoles = [mockRole];
            mockRolesService.getRoles.mockResolvedValue(mockRoles);

            const result = await controller.getRoles();

            expect(service.getRoles).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                message: 'Roles fetched successfully',
                data: mockRoles,
            });
        });

        it('should propagate errors from service', async () => {
            mockRolesService.getRoles.mockRejectedValue(new Error('Database error'));
            await expect(controller.getRoles()).rejects.toThrow('Database error');
        });
    });

    describe('createNewRoleForAdmin', () => {
        it('should create a new role', async () => {
            const createDto = {
                name: 'Editor',
                description: 'Editor role',
                permissionIds: ['perm_1', 'perm_2'],
            };

            mockRolesService.createNewRoleForAdmin.mockResolvedValue(mockRole);

            const result = await controller.createNewRoleForAdmin(createDto);

            expect(service.createNewRoleForAdmin).toHaveBeenCalledWith(createDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Role created successfully',
                data: mockRole,
            });
        });

        it('should propagate errors from service', async () => {
            mockRolesService.createNewRoleForAdmin.mockRejectedValue(
                new Error('Role with this name already exists'),
            );
            await expect(
                controller.createNewRoleForAdmin({ name: 'Admin', description: '' }),
            ).rejects.toThrow('Role with this name already exists');
        });
    });

    describe('updateRoleForAdmin', () => {
        it('should update an existing role', async () => {
            const updateDto = {
                description: 'Updated description',
            };

            const updatedRole = {
                ...mockRole,
                description: updateDto.description,
            };

            mockRolesService.updateRoleForAdmin.mockResolvedValue(updatedRole);

            const result = await controller.updateRoleForAdmin(updateDto, 'role_1');

            expect(service.updateRoleForAdmin).toHaveBeenCalledWith('role_1', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Role updated successfully',
                data: updatedRole,
            });
        });

        it('should propagate errors from service', async () => {
            mockRolesService.updateRoleForAdmin.mockRejectedValue(new Error('Role not found'));
            await expect(controller.updateRoleForAdmin({}, 'invalid_id')).rejects.toThrow(
                'Role not found',
            );
        });
    });

    describe('deleteRoleForAdmin', () => {
        it('should delete a role', async () => {
            mockRolesService.deleteRoleForAdmin.mockResolvedValue(undefined);

            const result = await controller.deleteRoleForAdmin('role_1');

            expect(service.deleteRoleForAdmin).toHaveBeenCalledWith('role_1');
            expect(result).toEqual({
                statusCode: 200,
                message: 'Role deleted successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockRolesService.deleteRoleForAdmin.mockRejectedValue(new Error('Role not found'));
            await expect(controller.deleteRoleForAdmin('invalid_id')).rejects.toThrow(
                'Role not found',
            );
        });
    });
});
