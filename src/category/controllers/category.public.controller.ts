import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { GetProductsByCategoryDto } from '../dto/get-products-by-category.dto';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from 'src/products/dto/product-response.dto';

@Controller('categories')
export class CategoryPublicController {
    constructor(private readonly categoryService: CategoryService) {}

    @Get('')
    async getCategoryTree() {
        const result = await this.categoryService.getCategoryTree();

        return {
            statusCode: 200,
            message: 'Category tree fetched successfully',
            data: result,
        };
    }

    @Get(':slug')
    async getProductsByCategory(
        @Param('slug') slug: string,
        @Query() query: GetProductsByCategoryDto,
    ) {
        const { data, meta } = await this.categoryService.getProductsByCategory(query, slug);

        const mappedData = plainToInstance(ProductResponseDto, data, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Products fetched successfully for the category',
            data: mappedData,
            meta,
        };
    }
}
