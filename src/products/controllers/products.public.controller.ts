import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductsService } from '../products.service';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from '../dto/product-response.dto';

@Controller('products')
export class ProductsPublicController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async getProducts(@Query() query: GetProductsDto) {
        const { data, meta } = await this.productsService.getProducts(query, 'published');

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
    async getProductDetail(@Param() param: GetProductDetailDto) {
        const result = await this.productsService.getProductDetail(param.slug, 'published');

        const mappedData = plainToInstance(ProductResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Product detail fetched successfully',
            data: mappedData,
        };
    }
}
