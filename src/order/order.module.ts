import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './controllers/order.public.controller';

@Module({
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule {}
