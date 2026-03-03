import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
    let service: ProductsService;
    let prisma: PrismaService;
    let _categoryService: CategoryService;

    const mockProduct = {
        id: 'prod_1',
        name: 'Test Product',
        slug: 'test-product',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        orderItems: [],
        productVariants: [
            { originalPrice: 100, discountPercent: 10 },
            { originalPrice: 200, discountPercent: null },
        ],
    };

    const mockPrismaService = {
        product: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        productVariant: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        artist: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const mockCategoryService = {
        isCategoryExists: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: CategoryService,
                    useValue: mockCategoryService,
                },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
        prisma = module.get<PrismaService>(PrismaService);
        _categoryService = module.get<CategoryService>(CategoryService);

        jest.clearAllMocks();
    });

    it('should fetch products', async () => {
        mockPrismaService.product.count.mockResolvedValue(0);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getProducts({ page: 1, limit: 10 });
        expect(result).toEqual({
            data: [],
            meta: { currentPage: 1, totalPages: 0, limit: 10, totalItems: 0 },
        });
    });

    it('should fetch product detail', async () => {
        mockPrismaService.product.findFirst.mockResolvedValue(mockProduct as any);

        const result = await service.getProductDetail('test-product');
        expect(result).toHaveProperty('id', 'prod_1');
        expect(result).toHaveProperty('maxPrice', 200);
    });

    it('should throw NotFoundException if product not found', async () => {
        mockPrismaService.product.findFirst.mockResolvedValue(null);

        await expect(service.getProductDetail('test-slug')).rejects.toThrow(NotFoundException);
    });

    it('should create a new product', async () => {
        mockCategoryService.isCategoryExists.mockResolvedValue(true);

        const mockResult = { id: '1', name: 'Test Product', slug: 'test-product' };
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
            const tx = {
                product: { create: jest.fn().mockResolvedValue(mockResult) },
                productVariant: { createMany: jest.fn() },
            };
            return callback(tx);
        });

        const result = await service.createNewProductForAdmin({
            name: 'Test Product',
            categoryId: '1',
            variants: [],
        } as any);

        expect(result).toHaveProperty('id', '1');
    });

    it('should throw NotFoundException if category not found during create', async () => {
        mockCategoryService.isCategoryExists.mockResolvedValue(false);

        await expect(
            service.createNewProductForAdmin({
                name: 'Test',
                categoryId: 'bad_cat',
                variants: [],
            } as any),
        ).rejects.toThrow(NotFoundException);
    });

    it('should update a product', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);

        const mockUpdatedProduct = { id: '1', name: 'Updated Product' };
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
            const tx = {
                product: {
                    update: jest.fn().mockResolvedValue(mockUpdatedProduct),
                    findUnique: jest.fn().mockResolvedValue(mockUpdatedProduct),
                },
                productVariant: { createMany: jest.fn(), deleteMany: jest.fn() },
            };
            return callback(tx);
        });

        const result = await service.updateProductForAdmin('1', { name: 'Updated Product' });
        expect(result).toHaveProperty('id', '1');
    });

    it('should throw NotFoundException if product to update is not found', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(null);

        await expect(service.updateProductForAdmin('invalid_id', { name: 'X' })).rejects.toThrow(
            NotFoundException,
        );
    });

    it('should remove a product', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
        mockPrismaService.product.delete.mockResolvedValue({ id: 'prod_1' } as any);

        await service.removeProductForAdmin('prod_1');
        expect(prisma.product.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product to remove is not found', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(null);

        await expect(service.removeProductForAdmin('1')).rejects.toThrow(NotFoundException);
    });
});
