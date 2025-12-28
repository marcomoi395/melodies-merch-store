import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsPublicController } from './controllers/products.public.controller';
import { ProductsAdminController } from './controllers/products.admin.controller';
import { CategoryModule } from 'src/category/category.module';

@Module({
    imports: [CategoryModule],
    controllers: [ProductsPublicController, ProductsAdminController],
    providers: [ProductsService],
})
export class ProductsModule {}
