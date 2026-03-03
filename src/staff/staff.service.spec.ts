import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('StaffService', () => {
    let service: StaffService;
    let prisma: PrismaService;

    const mockStaff = {
        id: 'staff_123',
        email: 'staff@example.com',
        fullName: 'Staff User',
        phoneNumber: '1234567890',
        passwordHash: 'hashedPassword',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [
            {
                role: {
                    id: 'role_1',
                    name: 'Admin',
                    rolePermissions: [
                        {
                            permission: {
                                id: 'perm_1',
                                resource: 'PRODUCT',
                                action: 'MANAGE',
                            },
                        },
                    ],
                },
            },
        ],
    };

    const mockPrismaService = {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        role: {
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaffService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<StaffService>(StaffService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('getAllStaff', () => {
        it('should return all staff members', async () => {
            const mockStaffList = [mockStaff];
            mockPrismaService.user.findMany.mockResolvedValue(mockStaffList);

            const result = await service.getAllStaff();

            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    status: { not: 'deleted' },
                    userRoles: { some: {} },
                },
                include: {
                    userRoles: {
                        include: {
                            role: {
                                include: {
                                    rolePermissions: {
                                        include: { permission: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        it('should return empty array if no staff found', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([]);

            const result = await service.getAllStaff();

            expect(result).toEqual([]);
        });
    });

    describe('registerStaffForAdmin', () => {
        it('should register a new staff member', async () => {
            const registerDto = {
                email: 'newstaff@example.com',
                password: 'Password@123',
                fullName: 'New Staff',
                phoneNumber: '1234567890',
                roleIds: ['role_1', 'role_2'],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role_1' }, { id: 'role_2' }]);
            mockPrismaService.user.create.mockResolvedValue(mockStaff);

            const result = await service.registerStaffForAdmin(registerDto);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: registerDto.email },
            });
            expect(prisma.role.findMany).toHaveBeenCalled();
            expect(prisma.user.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw ConflictException if email already exists', async () => {
            const registerDto = {
                email: 'existing@example.com',
                password: 'Password@123',
                fullName: 'Existing Staff',
                roleIds: ['role_1'],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockStaff);

            await expect(service.registerStaffForAdmin(registerDto as any)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.registerStaffForAdmin(registerDto as any)).rejects.toThrow(
                'User with this email already exists',
            );
        });

        it('should throw BadRequestException if role IDs do not exist', async () => {
            const registerDto = {
                email: 'newstaff@example.com',
                password: 'Password@123',
                fullName: 'New Staff',
                roleIds: ['role_1', 'invalid_role'],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(null);
            mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role_1' }]);

            await expect(service.registerStaffForAdmin(registerDto as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('updateStaffForAdmin', () => {
        it('should update staff member', async () => {
            const updateDto = {
                fullName: 'Updated Name',
                roleIds: ['role_1'],
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockStaff);
            mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role_1' }]);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockStaff,
                fullName: updateDto.fullName,
            });

            const result = await service.updateStaffForAdmin('staff_123', updateDto);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'staff_123', deletedAt: null },
            });
            expect(prisma.user.update).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException if staff not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.updateStaffForAdmin('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('removeStaffForAdmin', () => {
        it('should soft delete staff member', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockStaff);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockStaff,
                status: 'deleted',
            });

            await service.deleteAccountForAdmin('staff_123');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'staff_123', deletedAt: null },
            });
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'staff_123' },
                data: {
                    status: 'deleted',
                    email: expect.stringContaining('deleted_'),
                    deletedAt: expect.any(Date),
                },
            });
        });

        it('should throw NotFoundException if staff not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.deleteAccountForAdmin('invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
