import { Controller, Req } from '@nestjs/common';
import { OrderService } from '../order.service';
import { Post, Body, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/shared/guards/optional-jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { IJwtPayload } from 'src/auth/auth.interface';
import { Request } from 'express';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    @UseGuards(OptionalJwtAuthGuard)
    async createOrder(
        @Req() req: Request & { user: IJwtPayload | null },
        @Body() createOrderDto: CreateOrderDto,
    ) {
        const userId = req.user ? req.user.sub : null;

        const result = await this.orderService.createOrder(createOrderDto, userId);
        return {
            statusCode: 201,
            message: 'Order created successfully',
            data: result,
        };
    }
}
