import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from '../dto/create-product.dto';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { GetProductsForAdminDto } from '../dto/get-products-for-admin.dto';
import { RemoveProductDto } from '../dto/remove-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsService } from '../products.service';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from '../dto/product-response.dto';

@Controller('admin/products')
export class ProductsAdminController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'VIEW')
    async getProductsForAdmin(@Query() query: GetProductsForAdminDto) {
        const { meta, data } = await this.productsService.getProducts(query, query.status);

        const mappedData = plainToInstance(ProductResponseDto, data, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Products fetched successfully',
            data: mappedData,
            meta,
        };
    }

    @Get(':slug')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'VIEW')
    async getProductDetailForAdmin(@Param() param: GetProductDetailDto) {
        const result = await this.productsService.getProductDetail(param.slug);

        const mappedData = plainToInstance(ProductResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: mappedData,
        };
    }

    @Post('')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'CREATE')
    async createNewProductForAdmin(@Body() body: CreateProductDto) {
        const result = await this.productsService.createNewProductForAdmin(body);

        const mappedData = plainToInstance(ProductResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Product created successfully',
            data: mappedData,
        };
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'UPDATE')
    async updateProductForAdmin(@Body() body: UpdateProductDto, @Param('id') id: string) {
        const result = await this.productsService.updateProductForAdmin(id, body);

        const mappedData = plainToInstance(ProductResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Product updated successfully',
            data: mappedData,
        };
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'DELETE')
    async removeProductForAdmin(@Param() param: RemoveProductDto) {
        await this.productsService.removeProductForAdmin(param.id);

        return {
            statusCode: 200,
            message: 'Product removed successfully',
        };
    }
}
