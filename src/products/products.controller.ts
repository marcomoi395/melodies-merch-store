import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { GetProductDetailDto } from './dto/get-product-detail.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async getProducts(@Query() query: GetProductsDto) {
        const result = await this.productsService.getProducts(query);

        return {
            statusCode: 200,
            message: 'Products fetched successfully',
            ...result,
        };
    }

    @Get(':id')
    async getProductDetail(@Param() param: GetProductDetailDto) {
        const result = await this.productsService.getProductDetail(param.id);

        return {
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: result,
        };
    }
}
