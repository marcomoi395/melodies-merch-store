import {
    Body,
    Controller,
    Delete,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission('CATEGORY', 'MANAGE')
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
    async updateCategoryForAdmin(
        @Body() body: UpdateCategoryDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.categoryService.updateCategory(id, body);

        return {
            statusCode: 200,
            message: 'Category updated successfully',
            data: result,
        };
    }

    @Delete(':id')
    async deleteCategoryForAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        await this.categoryService.deleteCategoryForAdmin(id);

        return {
            statusCode: 204,
            message: 'Category deleted successfully',
        };
    }
}
