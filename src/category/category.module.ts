import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryPublicController } from './controllers/category.public.controller';
import { CategoryAdminController } from './controllers/category.admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/database/entities/category.entity';
import { ProductEntity } from 'src/database/entities/product.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CategoryEntity, ProductEntity])],
    controllers: [CategoryPublicController, CategoryAdminController],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule {}
