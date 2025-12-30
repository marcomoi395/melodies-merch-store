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

@Controller('admin/products')
export class ProductsAdminController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('PRODUCT', 'VIEW')
    async getProductsForAdmin(@Query() query: GetProductsForAdminDto) {
        const result = await this.productsService.getProducts(query, query.status);

        return {
            statusCode: 200,
            message: 'Products fetched successfully',
            ...result,
        };
    }

    @Get(':slug')
    async getProductDetailForAdmin(@Param() param: GetProductDetailDto) {
        const result = await this.productsService.getProductDetail(param.slug);

        return {
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: result,
        };
    }

    @Post('')
    // @UseGuards(AuthGuard('jwt'))
    async createNewProductForAdmin(@Body() body: CreateProductDto) {
        const result = await this.productsService.createNewProductForAdmin(body);

        return {
            statusCode: 201,
            message: 'Product created successfully',
            data: result,
        };
    }

    @Patch(':id')
    // @UseGuards(AuthGuard('jwt'))
    async updateProductForAdmin(@Body() body: UpdateProductDto, @Param('id') id: string) {
        const result = await this.productsService.updateProductForAdmin(id, body);

        return {
            statusCode: 200,
            message: 'Product updated successfully',
            data: result,
        };
    }

    @Delete(':id')
    // @UseGuards(AuthGuard('jwt'))
    async removeProductForAdmin(@Param() param: RemoveProductDto) {
        const result = await this.productsService.removeProductForAdmin(param.id);

        return {
            statusCode: 200,
            message: 'Product removed successfully',
            data: result,
        };
    }
}
