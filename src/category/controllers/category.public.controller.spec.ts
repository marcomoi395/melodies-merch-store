import { Test, TestingModule } from '@nestjs/testing';
import { CategoryPublicController } from './category.public.controller';
import { CategoryService } from '../category.service';

describe('CategoryPublicController', () => {
    let controller: CategoryPublicController;
    let service: CategoryService;

    const mockCategory = {
        id: 'cat_123',
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
    };

    const mockCategoryService = {
        getCategoryTree: jest.fn(),
        getProductsByCategory: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CategoryPublicController],
            providers: [
                {
                    provide: CategoryService,
                    useValue: mockCategoryService,
                },
            ],
        }).compile();

        controller = module.get<CategoryPublicController>(CategoryPublicController);
        service = module.get<CategoryService>(CategoryService);

        jest.clearAllMocks();
    });

    describe('getCategoryTree', () => {
        it('should return all categories', async () => {
            const mockCategories = [mockCategory];
            mockCategoryService.getCategoryTree.mockResolvedValue(mockCategories);

            const result = await controller.getCategoryTree();

            expect(service.getCategoryTree).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                message: 'Category tree fetched successfully',
                data: mockCategories,
            });
        });

        it('should propagate errors from service', async () => {
            mockCategoryService.getCategoryTree.mockRejectedValue(new Error('Database error'));
            await expect(controller.getCategoryTree()).rejects.toThrow('Database error');
        });
    });

    describe('getProductsByCategory', () => {
        it('should return products by category', async () => {
            const mockResult = {
                data: [
                    {
                        id: 'prod_1',
                        name: 'Test Product',
                        slug: 'test-product',
                    },
                ],
                meta: {
                    currentPage: 1,
                    totalPages: 1,
                    limit: 10,
                    totalItems: 1,
                },
            };

            mockCategoryService.getProductsByCategory.mockResolvedValue(mockResult);

            const result = await controller.getProductsByCategory('test-category', {
                page: 1,
                limit: 10,
            });

            expect(service.getProductsByCategory).toHaveBeenCalledWith(
                { page: 1, limit: 10 },
                'test-category',
            );
            expect(result).toEqual({
                statusCode: 200,
                message: 'Products fetched successfully for the category',
                data: expect.any(Array),
                meta: mockResult.meta,
            });
        });

        it('should propagate errors from service', async () => {
            mockCategoryService.getProductsByCategory.mockRejectedValue(
                new Error('Category not found'),
            );
            await expect(
                controller.getProductsByCategory('invalid-slug', { page: 1, limit: 10 }),
            ).rejects.toThrow('Category not found');
        });
    });
});
