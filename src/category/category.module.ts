import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryPublicController } from './controllers/category.public.controller';
import { CategoryAdminController } from './controllers/category.admin.controller';

@Module({
    controllers: [CategoryPublicController, CategoryAdminController],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule {}
