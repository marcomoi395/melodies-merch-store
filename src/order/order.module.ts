import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderAdminController } from './controllers/order.admin.controller';
import { OrderPublicController } from './controllers/order.public.controller';

@Module({
    controllers: [OrderPublicController, OrderAdminController],
    providers: [OrderService],
})
export class OrderModule {}
