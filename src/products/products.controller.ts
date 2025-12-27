import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async findAll(@Query() query: GetProductsDto) {
        const result = await this.productsService.findAll(query);

        return {
            statusCode: 200,
            message: 'Products fetched successfully',
            ...result,
        };
    }
}
