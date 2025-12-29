import { Body, Controller, Post } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Controller('admin/categories')
export class CategoryAdminController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    async createNewCategoryForAdmin(@Body() body: CreateCategoryDto) {
        const result = await this.categoryService.createCategory(body);

        return {
            statusCode: 201,
            message: 'Category created successfully',
            data: result,
        };
    }
}
