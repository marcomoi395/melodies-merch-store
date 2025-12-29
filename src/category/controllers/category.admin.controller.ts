import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

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

    @Patch(':id')
    async updateCategoryForAdmin(@Body() body: UpdateCategoryDto, @Param('id') id: string) {
        const result = await this.categoryService.updateCategory(id, body);

        return {
            statusCode: 200,
            message: 'Category updated successfully',
            data: result,
        };
    }
}
