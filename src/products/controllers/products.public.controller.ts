import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductsService } from '../products.service';

@Controller('products')
export class ProductsPublicController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async getProducts(@Query() query: GetProductsDto) {
        const result = await this.productsService.getProducts(query, 'published');

        return {
            statusCode: 200,
            message: 'Products fetched successfully',
            ...result,
        };
    }

    @Get(':slug')
    async getProductDetail(@Param() param: GetProductDetailDto) {
        const result = await this.productsService.getProductDetail(param.slug, 'published');

        return {
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: result,
        };
    }
}
