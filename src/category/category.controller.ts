import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { GetProductsByCategoryDto } from './dto/get-products-by-category.dto';

@Controller('category')
export class CategoryController {
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
        const result = await this.categoryService.getProductsByCategory(query, slug);

        return {
            statusCode: 200,
            message: 'Products fetched successfully for the category',
            ...result,
        };
    }
}
