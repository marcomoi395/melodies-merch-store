import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OrderService } from '../order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { plainToInstance } from 'class-transformer';
import { OrderResponseDto } from '../dto/order-response.dto';
import { PreviewOrderDto } from '../dto/preview.dto';
import { TrackOrderDto } from '../dto/track-order.dto';
import { TrackedOrderResponseDto } from '../dto/tracked-order-response.dto';

@Controller('order')
export class OrderPublicController {
    constructor(private readonly orderService: OrderService) {}

    @Post('preview')
    @HttpCode(200)
    async previewOrder(@Body() body: PreviewOrderDto) {
        const result = await this.orderService.previewOrder(body);

        const mappedData = plainToInstance(OrderResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Order preview generated successfully',
            data: mappedData,
        };
    }

    @Post('track')
    @HttpCode(200)
    async trackOrders(@Body() body: TrackOrderDto) {
        const result = await this.orderService.trackGuestOrders(body);
        const data = plainToInstance(TrackedOrderResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Order tracking retrieved successfully',
            data,
        };
    }

    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        const result = await this.orderService.createOrder(createOrderDto);

        const mappedData = plainToInstance(OrderResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Order created successfully',
            data: mappedData,
        };
    }
}
