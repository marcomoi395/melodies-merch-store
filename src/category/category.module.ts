import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryPublicController } from './controllers/category.public.controller';

@Module({
    controllers: [CategoryPublicController],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule {}
