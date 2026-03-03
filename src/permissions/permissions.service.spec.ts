import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PermissionsService', () => {
    let service: PermissionsService;
    let prisma: PrismaService;

    const mockPermissions = [
        {
            id: 'perm_1',
            resource: 'PRODUCT',
            action: 'VIEW',
            description: 'View products',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'perm_2',
            resource: 'PRODUCT',
            action: 'MANAGE',
            description: 'Manage products',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'perm_3',
            resource: 'ORDER',
            action: 'VIEW',
            description: 'View orders',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    const mockPrismaService = {
        permission: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<PermissionsService>(PermissionsService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('getPermisisons', () => {
        it('should return all permissions ordered by resource', async () => {
            mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

            const result = await service.getPermisisons();

            expect(prisma.permission.findMany).toHaveBeenCalledWith({
                orderBy: { resource: 'asc' },
            });
            expect(result).toEqual(mockPermissions);
            expect(result).toHaveLength(3);
        });

        it('should throw NotFoundException when no permissions exist', async () => {
            mockPrismaService.permission.findMany.mockResolvedValue([]);

            await expect(service.getPermisisons()).rejects.toThrow(NotFoundException);
            await expect(service.getPermisisons()).rejects.toThrow('No permissions found');
        });

        it('should throw NotFoundException when permissions is null', async () => {
            mockPrismaService.permission.findMany.mockResolvedValue(null);

            await expect(service.getPermisisons()).rejects.toThrow(NotFoundException);
        });
    });
});
