import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { ProductsService } from '../products.service';
import { GetProductsForAdminDto } from '../dto/get-products-for-admin.dto';
import { CreateProductDto } from '../dto/create-product.dto';

@Controller('admin/products')
export class ProductsAdminController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
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
            statusCode: 200,
            message: 'Product created successfully',
            data: result,
        };
    }
}
