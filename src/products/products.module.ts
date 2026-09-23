import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsPublicController } from './controllers/products.public.controller';
import { ProductsAdminController } from './controllers/products.admin.controller';
import { CategoryModule } from 'src/category/category.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistEntity } from 'src/database/entities/artist.entity';
import { ProductEntity } from 'src/database/entities/product.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';
import { OrderItemEntity } from 'src/database/entities/order-item.entity';

@Module({
    imports: [
        CategoryModule,
        TypeOrmModule.forFeature([
            ProductEntity,
            ArtistEntity,
            ProductVariantEntity,
            OrderItemEntity,
        ]),
    ],
    controllers: [ProductsPublicController, ProductsAdminController],
    providers: [ProductsService],
})
export class ProductsModule {}
