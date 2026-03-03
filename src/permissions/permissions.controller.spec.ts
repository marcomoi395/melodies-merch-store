import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from './permissions.guard';

describe('PermissionsController', () => {
    let controller: PermissionsController;
    let service: PermissionsService;

    const mockPermissions = [
        {
            id: 'perm_1',
            resource: 'PRODUCT',
            action: 'VIEW',
            description: 'View products',
        },
        {
            id: 'perm_2',
            resource: 'PRODUCT',
            action: 'MANAGE',
            description: 'Manage products',
        },
    ];

    const mockPermissionsService = {
        getPermisisons: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PermissionsController],
            providers: [
                {
                    provide: PermissionsService,
                    useValue: mockPermissionsService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<PermissionsController>(PermissionsController);
        service = module.get<PermissionsService>(PermissionsService);

        jest.clearAllMocks();
    });

    describe('getPermissions', () => {
        it('should return all permissions with formatted response', async () => {
            mockPermissionsService.getPermisisons.mockResolvedValue(mockPermissions);

            const result = await controller.getPermissions();

            expect(service.getPermisisons).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                message: 'Permissions fetched successfully',
                data: mockPermissions,
            });
        });

        it('should propagate errors from service', async () => {
            mockPermissionsService.getPermisisons.mockRejectedValue(
                new Error('No permissions found'),
            );

            await expect(controller.getPermissions()).rejects.toThrow('No permissions found');
        });
    });
});
