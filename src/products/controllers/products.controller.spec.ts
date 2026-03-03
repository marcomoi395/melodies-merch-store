import { Test, TestingModule } from '@nestjs/testing';
import { ProductsAdminController } from './products.admin.controller';
import { ProductsPublicController } from './products.public.controller';
import { ProductsService } from '../products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { GetProductsForAdminDto } from '../dto/get-products-for-admin.dto';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { RemoveProductDto } from '../dto/remove-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../../permissions/permissions.guard';
import { ProductResponseDto } from '../dto/product-response.dto';
import { plainToInstance } from 'class-transformer';

describe('ProductsAdminController', () => {
    let controller: ProductsAdminController;
    let service: ProductsService;

    const mockProductsService = {
        getProducts: jest.fn(),
        getProductDetail: jest.fn(),
        createNewProductForAdmin: jest.fn(),
        updateProductForAdmin: jest.fn(),
        removeProductForAdmin: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsAdminController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: mockProductsService,
                },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({ canActivate: () => true })
            .overrideGuard(PermissionGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ProductsAdminController>(ProductsAdminController);
        service = module.get<ProductsService>(ProductsService);

        jest.clearAllMocks();
    });

    it('should fetch products for admin', async () => {
        const query: GetProductsForAdminDto = { page: 1, limit: 10 };
        mockProductsService.getProducts.mockResolvedValue({
            data: [],
            meta: {
                currentPage: 1,
                totalPages: 0,
                limit: 10,
                totalItems: 0,
            },
        });

        const result = await controller.getProductsForAdmin(query);

        expect(service.getProducts).toHaveBeenCalledWith(query, query.status);
        expect(result).toEqual({
            statusCode: 200,
            message: 'Products fetched successfully',
            data: [],
            meta: {
                currentPage: 1,
                totalPages: 0,
                limit: 10,
                totalItems: 0,
            },
        });
    });

    it('should propagate errors from getProductsForAdmin', async () => {
        mockProductsService.getProducts.mockRejectedValue(new Error('Database error'));
        await expect(controller.getProductsForAdmin({ page: 1, limit: 10 })).rejects.toThrow(
            'Database error',
        );
    });

    it('should fetch product detail for admin', async () => {
        const param: GetProductDetailDto = { slug: 'test-slug' };

        const mockServiceResult = {
            id: 1,
            name: 'Áo thun Melodies',
            slug: 'test-slug',
            maxPrice: 200000,
            minPrice: 100000,
        };

        mockProductsService.getProductDetail.mockResolvedValue(mockServiceResult as any);

        const result = await controller.getProductDetailForAdmin(param);

        expect(service.getProductDetail).toHaveBeenCalledWith(param.slug);
        expect(result).toEqual({
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: expect.objectContaining(mockServiceResult),
        });
        expect(result.data).toBeInstanceOf(ProductResponseDto);
    });

    it('should propagate errors from getProductDetailForAdmin', async () => {
        mockProductsService.getProductDetail.mockRejectedValue(new Error('Product not found'));
        await expect(controller.getProductDetailForAdmin({ slug: 'bad-slug' })).rejects.toThrow(
            'Product not found',
        );
    });

    it('should create a new product and return mapped data', async () => {
        const createDto: CreateProductDto = {
            name: 'Áo thun Melodies',
            description: 'Chất liệu cotton 100%',
            shortDescription: 'Áo thun xịn',
            categoryId: 'cat_01',
            mediaGallery: [],
            productType: 'merch',
            variants: [],
        };
        const mockServiceResult = {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            name: 'Áo thun Melodies',
            description: 'Chất liệu cotton 100%',
            categoryId: '1',
            variants: [],
            artistIds: [],
            mediaGallery: [],
            productType: 'PHYSICAL',
            shortDescription: 'Áo thun xịn',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const expectedOutput = plainToInstance(ProductResponseDto, mockServiceResult, {
            excludeExtraneousValues: true,
        });
        mockProductsService.createNewProductForAdmin.mockResolvedValue(mockServiceResult as any);

        const result = await controller.createNewProductForAdmin(createDto);

        expect(service.createNewProductForAdmin).toHaveBeenCalledWith(createDto);
        expect(result.statusCode).toBe(201);
        expect(result.message).toBe('Product created successfully');
        expect(result.data).toBeInstanceOf(ProductResponseDto);
        expect(result.data).toEqual(expectedOutput);
    });

    it('should propagate errors from createNewProductForAdmin', async () => {
        mockProductsService.createNewProductForAdmin.mockRejectedValue(
            new Error('Category not found'),
        );
        await expect(controller.createNewProductForAdmin({} as any)).rejects.toThrow(
            'Category not found',
        );
    });

    it('should update a product and return mapped data', async () => {
        const id = '1';
        const body: UpdateProductDto = { name: 'Updated Product Name' };

        const mockUpdatedProduct = {
            id,
            name: 'Updated Product Name',
            slug: 'updated-product-name',
        };

        mockProductsService.updateProductForAdmin.mockResolvedValue(mockUpdatedProduct as any);

        const result = await controller.updateProductForAdmin(body, id);

        expect(service.updateProductForAdmin).toHaveBeenCalledWith(id, body);
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe('Product updated successfully');
        expect(result.data).toBeInstanceOf(ProductResponseDto);
        expect(result.data.name).toBe(body.name);
    });

    it('should propagate errors from updateProductForAdmin', async () => {
        mockProductsService.updateProductForAdmin.mockRejectedValue(new Error('Product not found'));
        await expect(controller.updateProductForAdmin({}, 'invalid_id')).rejects.toThrow(
            'Product not found',
        );
    });

    it('should remove a product', async () => {
        const param: RemoveProductDto = { id: '1' };
        mockProductsService.removeProductForAdmin.mockResolvedValue(undefined);

        const result = await controller.removeProductForAdmin(param);

        expect(service.removeProductForAdmin).toHaveBeenCalledWith(param.id);
        expect(result).toEqual({
            statusCode: 200,
            message: 'Product removed successfully',
        });
    });

    it('should propagate errors from removeProductForAdmin', async () => {
        mockProductsService.removeProductForAdmin.mockRejectedValue(new Error('Product not found'));
        await expect(controller.removeProductForAdmin({ id: 'invalid_id' })).rejects.toThrow(
            'Product not found',
        );
    });
});

describe('ProductsPublicController', () => {
    let controller: ProductsPublicController;
    let service: ProductsService;

    const mockProductsService = {
        getProducts: jest.fn(),
        getProductDetail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsPublicController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: mockProductsService,
                },
            ],
        }).compile();

        controller = module.get<ProductsPublicController>(ProductsPublicController);
        service = module.get<ProductsService>(ProductsService);

        jest.clearAllMocks();
    });

    it('should fetch products with "published" status', async () => {
        const query = { page: 1, limit: 10 };
        const mockServiceResult = {
            data: [{ id: '1', name: 'Product 1' }],
            meta: { totalItems: 1 },
        };

        mockProductsService.getProducts.mockResolvedValue(mockServiceResult as any);

        const result = await controller.getProducts(query);

        expect(service.getProducts).toHaveBeenCalledWith(query, 'published');
        expect(result.statusCode).toBe(200);
        expect(result.data[0]).toBeInstanceOf(ProductResponseDto);
    });

    it('should propagate errors from getProducts', async () => {
        mockProductsService.getProducts.mockRejectedValue(new Error('Database error'));
        await expect(controller.getProducts({ page: 1, limit: 10 })).rejects.toThrow(
            'Database error',
        );
    });

    it('should fetch product detail and return mapped data', async () => {
        const param: GetProductDetailDto = { slug: 'test-slug' };
        const mockProduct = {
            id: '1',
            name: 'Public Product',
            slug: 'test-slug',
            status: 'published',
        };

        mockProductsService.getProductDetail.mockResolvedValue(mockProduct as any);

        const result = await controller.getProductDetail(param);

        expect(service.getProductDetail).toHaveBeenCalledWith(param.slug, 'published');
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe('Product detail fetched successfully');
        expect(result.data).toBeInstanceOf(ProductResponseDto);
        expect(result.data.slug).toBe(param.slug);
    });

    it('should propagate errors from getProductDetail', async () => {
        mockProductsService.getProductDetail.mockRejectedValue(new Error('Product not found'));
        await expect(controller.getProductDetail({ slug: 'bad-slug' })).rejects.toThrow(
            'Product not found',
        );
    });
});
