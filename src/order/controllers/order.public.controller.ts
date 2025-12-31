import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { OrderService } from '../order.service';
import { Post, Body, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/shared/guards/optional-jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { IJwtPayload } from 'src/auth/auth.interface';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GetOrdersDto } from '../dto/get-order.dto';

@Controller('order')
export class OrderPublicController {
    constructor(private readonly orderService: OrderService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getOrders(@Req() req: Request & { user: IJwtPayload }, @Query() query: GetOrdersDto) {
        const result = await this.orderService.getOrdersByUserId(req.user.sub, query);

        return {
            statusCode: 200,
            message: 'Orders retrieved successfully',
            data: result,
        };
    }

    @Get(':id')
    async getOrderByOrderId(@Param('id', new ParseUUIDPipe()) id: string) {
        const result = await this.orderService.getOrderById(id);

        return {
            statusCode: 200,
            message: 'Order retrieved successfully',
            data: result,
        };
    }

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

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async cancelOrder(
        @Req() req: Request & { user: IJwtPayload },
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        await this.orderService.cancelOrder(id, req.user.sub);

        return {
            statusCode: 200,
            message: 'Order cancelled successfully',
        };
    }
}
