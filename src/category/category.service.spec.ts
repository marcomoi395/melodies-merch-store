import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

describe('CategoryService', () => {
    let service: CategoryService;
    let prisma: PrismaService;

    const mockCategory = {
        id: 'cat_123',
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    };

    const mockPrismaService = {
        category: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        product: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoryService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<CategoryService>(CategoryService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('isCategoryExists', () => {
        it('should return true if category exists by id', async () => {
            mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);

            const result = await service.isCategoryExists({ id: 'cat_123' });

            expect(result).toBe(true);
        });

        it('should return true if category exists by slug', async () => {
            mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);

            const result = await service.isCategoryExists({ slug: 'test-category' });

            expect(result).toBe(true);
        });

        it('should return false if category does not exist', async () => {
            mockPrismaService.category.findFirst.mockResolvedValue(null);

            const result = await service.isCategoryExists({ id: 'invalid_id' });

            expect(result).toBe(false);
        });

        it('should return false if no id or slug provided', async () => {
            const result = await service.isCategoryExists({});

            expect(result).toBe(false);
        });
    });

    describe('getCategoryTree', () => {
        it('should return all categories', async () => {
            const mockCategories = [mockCategory];
            mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

            const result = await service.getCategoryTree();

            expect(prisma.category.findMany).toHaveBeenCalled();
            expect(result).toEqual(mockCategories);
        });
    });

    describe('getProductsByCategory', () => {
        it('should return products by category slug', async () => {
            const mockProducts = [
                {
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
            ];

            mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
            mockPrismaService.product.count.mockResolvedValue(1);

            const result = await service.getProductsByCategory(
                { page: 1, limit: 10 },
                'test-category',
            );

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        category: { slug: 'test-category' },
                    }),
                }),
            );
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
        });
    });

    describe('createNewCategoryForAdmin', () => {
        it('should create a new category', async () => {
            const createDto = {
                name: 'New Category',
                description: 'New description',
            };

            mockPrismaService.category.create.mockResolvedValue({
                ...mockCategory,
                name: createDto.name,
            });

            const result = await service.createCategory(createDto);

            expect(prisma.category.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: createDto.name,
                    slug: expect.any(String),
                }),
            });
            expect(result).toBeDefined();
        });

        it('should throw ConflictException if slug already exists', async () => {
            const createDto = {
                name: 'Existing Category',
            };

            const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['slug'] },
            });
            mockPrismaService.category.create.mockRejectedValue(error);

            await expect(service.createCategory(createDto)).rejects.toThrow(ConflictException);
        });
    });

    describe('updateCategoryForAdmin', () => {
        it('should update a category', async () => {
            const updateDto = {
                name: 'Updated Category',
            };

            mockPrismaService.category.update.mockResolvedValue({
                ...mockCategory,
                name: updateDto.name,
            });

            const result = await service.updateCategory('cat_123', updateDto);

            expect(prisma.category.update).toHaveBeenCalledWith({
                where: { id: 'cat_123' },
                data: expect.objectContaining({
                    name: updateDto.name,
                }),
            });
            expect(result.name).toBe(updateDto.name);
        });

        it('should throw NotFoundException if category not found', async () => {
            const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });
            mockPrismaService.category.update.mockRejectedValue(error);

            await expect(service.updateCategory('invalid_id', {})).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('deleteCategoryForAdmin', () => {
        it('should delete a category', async () => {
            mockPrismaService.category.count.mockResolvedValue(0);
            mockPrismaService.category.delete.mockResolvedValue(mockCategory);

            await service.deleteCategoryForAdmin('cat_123');

            expect(prisma.category.count).toHaveBeenCalledWith({
                where: { parentId: 'cat_123' },
            });
            expect(prisma.category.delete).toHaveBeenCalledWith({
                where: { id: 'cat_123' },
            });
        });

        it('should throw NotFoundException if category not found', async () => {
            mockPrismaService.category.count.mockResolvedValue(0);
            const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });
            mockPrismaService.category.delete.mockRejectedValue(error);

            await expect(service.deleteCategoryForAdmin('invalid_id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
