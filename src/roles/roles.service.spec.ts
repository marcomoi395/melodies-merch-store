import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('RolesService', () => {
    let service: RolesService;
    let prisma: PrismaService;

    const mockRole = {
        id: 'role_1',
        name: 'Admin',
        description: 'Administrator role',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        rolePermissions: [
            {
                permission: {
                    id: 'perm_1',
                    resource: 'PRODUCT',
                    action: 'MANAGE',
                },
            },
        ],
    };

    const mockPrismaService = {
        role: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        permission: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('getRoles', () => {
        it('should return all non-deleted roles', async () => {
            const mockRoles = [mockRole];
            mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

            const result = await service.getRoles();

            expect(prisma.role.findMany).toHaveBeenCalledWith({
                where: { deletedAt: null },
                include: {
                    rolePermissions: {
                        include: { permission: true },
                    },
                },
            });
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('createNewRoleForAdmin', () => {
        it('should create a new role with permissions', async () => {
            const createDto = {
                name: 'Editor',
                description: 'Editor role',
                permissionIds: ['perm_1', 'perm_2'],
            };

            mockPrismaService.role.findUnique.mockResolvedValue(null);
            mockPrismaService.permission.findMany.mockResolvedValue([
                { id: 'perm_1' },
                { id: 'perm_2' },
            ]);
            mockPrismaService.role.create.mockResolvedValue(mockRole);

            const result = await service.createNewRoleForAdmin(createDto);

            expect(prisma.role.findUnique).toHaveBeenCalledWith({
                where: { name: createDto.name },
            });
            expect(prisma.permission.findMany).toHaveBeenCalled();
            expect(prisma.role.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw ConflictException if role name already exists', async () => {
            const createDto = {
                name: 'Admin',
                description: 'Admin role',
            };

            mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

            await expect(service.createNewRoleForAdmin(createDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.createNewRoleForAdmin(createDto)).rejects.toThrow(
                'Role with this name already exists',
            );
        });

        it('should throw BadRequestException if permission IDs do not exist', async () => {
            const createDto = {
                name: 'NewRole',
                description: 'New role',
                permissionIds: ['perm_1', 'invalid_perm'],
            };

            mockPrismaService.role.findUnique.mockResolvedValue(null);
            mockPrismaService.permission.findMany.mockResolvedValue([{ id: 'perm_1' }]);

            await expect(service.createNewRoleForAdmin(createDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('updateRoleForAdmin', () => {
        it('should update an existing role', async () => {
            const updateDto = {
                description: 'Updated description',
                permissionIds: ['perm_1'],
            };

            mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
            mockPrismaService.permission.findMany.mockResolvedValue([{ id: 'perm_1' }]);
            mockPrismaService.role.update.mockResolvedValue({
                ...mockRole,
                description: updateDto.description,
            });

            const result = await service.updateRoleForAdmin('role_1', updateDto);

            expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { id: 'role_1' } });
            expect(prisma.role.update).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException if role does not exist', async () => {
            mockPrismaService.role.findUnique.mockResolvedValue(null);

            await expect(service.updateRoleForAdmin('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw ConflictException if updating to existing role name', async () => {
            const updateDto = {
                name: 'ExistingRole',
            };

            mockPrismaService.role.findUnique
                .mockResolvedValueOnce(mockRole)
                .mockResolvedValueOnce({ id: 'role_2', name: 'ExistingRole' });

            await expect(service.updateRoleForAdmin('role_1', updateDto)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('deleteRoleForAdmin', () => {
        it('should soft delete a role', async () => {
            mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
            mockPrismaService.$transaction.mockImplementation((callback) => {
                const tx = {
                    userRole: { deleteMany: jest.fn() },
                    role: {
                        update: jest.fn().mockResolvedValue({ ...mockRole, deletedAt: new Date() }),
                    },
                };
                return callback(tx);
            });

            await service.deleteRoleForAdmin('role_1');

            expect(prisma.role.findFirst).toHaveBeenCalledWith({
                where: { id: 'role_1', deletedAt: null },
            });
        });

        it('should throw NotFoundException if role does not exist', async () => {
            mockPrismaService.role.findFirst.mockResolvedValue(null);

            await expect(service.deleteRoleForAdmin('invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
