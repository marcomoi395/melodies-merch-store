import { Test, TestingModule } from '@nestjs/testing';
import { CategoryAdminController } from './category.admin.controller';
import { CategoryService } from '../category.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from 'src/permissions/permissions.guard';

describe('CategoryAdminController', () => {
    let controller: CategoryAdminController;
    let service: CategoryService;

    const mockCategory = {
        id: 'cat_123',
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
    };

    const mockCategoryService = {
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategoryForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CategoryAdminController],
            providers: [
                {
                    provide: CategoryService,
                    useValue: mockCategoryService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CategoryAdminController>(CategoryAdminController);
        service = module.get<CategoryService>(CategoryService);

        jest.clearAllMocks();
    });

    describe('createNewCategoryForAdmin', () => {
        it('should create a new category', async () => {
            const createDto = {
                name: 'New Category',
                description: 'New description',
            };

            mockCategoryService.createCategory.mockResolvedValue(mockCategory);

            const result = await controller.createNewCategoryForAdmin(createDto);

            expect(service.createCategory).toHaveBeenCalledWith(createDto);
            expect(result).toEqual({
                statusCode: 201,
                message: 'Category created successfully',
                data: mockCategory,
            });
        });

        it('should propagate errors from service', async () => {
            mockCategoryService.createCategory.mockRejectedValue(
                new Error('Category slug already exists'),
            );
            await expect(
                controller.createNewCategoryForAdmin({ name: 'Existing' }),
            ).rejects.toThrow('Category slug already exists');
        });
    });

    describe('updateCategoryForAdmin', () => {
        it('should update a category', async () => {
            const updateDto = {
                name: 'Updated Category',
            };

            const updatedCategory = {
                ...mockCategory,
                name: updateDto.name,
            };

            mockCategoryService.updateCategory.mockResolvedValue(updatedCategory);

            const result = await controller.updateCategoryForAdmin(updateDto, 'cat_123');

            expect(service.updateCategory).toHaveBeenCalledWith('cat_123', updateDto);
            expect(result).toEqual({
                statusCode: 200,
                message: 'Category updated successfully',
                data: updatedCategory,
            });
        });

        it('should propagate errors from service', async () => {
            mockCategoryService.updateCategory.mockRejectedValue(new Error('Category not found'));
            await expect(controller.updateCategoryForAdmin({}, 'invalid_id')).rejects.toThrow(
                'Category not found',
            );
        });
    });

    describe('deleteCategoryForAdmin', () => {
        it('should delete a category', async () => {
            mockCategoryService.deleteCategoryForAdmin.mockResolvedValue(undefined);

            const result = await controller.deleteCategoryForAdmin('cat_123');

            expect(service.deleteCategoryForAdmin).toHaveBeenCalledWith('cat_123');
            expect(result).toEqual({
                statusCode: 204,
                message: 'Category deleted successfully',
            });
        });

        it('should propagate errors from service', async () => {
            mockCategoryService.deleteCategoryForAdmin.mockRejectedValue(
                new Error('Category not found'),
            );
            await expect(controller.deleteCategoryForAdmin('invalid_id')).rejects.toThrow(
                'Category not found',
            );
        });
    });
});
