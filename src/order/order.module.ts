import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderAdminController } from './controllers/order.admin.controller';
import { OrderPublicController } from './controllers/order.public.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountEntity } from 'src/database/entities/discount.entity';
import { OrderEntity } from 'src/database/entities/order.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrderEntity, ProductVariantEntity, DiscountEntity])],
    controllers: [OrderPublicController, OrderAdminController],
    providers: [OrderService],
})
export class OrderModule {}
