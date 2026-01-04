import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { OrderService } from '../order.service';
import { Post, Body, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from 'src/shared/guards/optional-jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { IJwtPayload } from 'src/auth/auth.interface';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GetOrdersDto } from '../dto/get-order.dto';
import { plainToInstance } from 'class-transformer';
import { OrderResponseDto } from '../dto/order-response.dto';
import { PreviewOrderDto } from '../dto/preview.dto';

@Controller('order')
export class OrderPublicController {
    constructor(private readonly orderService: OrderService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getOrders(@Req() req: Request & { user: IJwtPayload }, @Query() query: GetOrdersDto) {
        const { data, meta } = await this.orderService.getOrdersByUserId(req.user.sub, query);

        const mappedData = plainToInstance(OrderResponseDto, data, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Orders retrieved successfully',
            data: mappedData,
            meta,
        };
    }

    @Get(':id')
    async getOrderByOrderId(@Param('id', new ParseUUIDPipe()) id: string) {
        const result = await this.orderService.getOrderById(id);

        const mappedData = plainToInstance(OrderResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Order retrieved successfully',
            data: mappedData,
        };
    }

    @Post('preview')
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

    @Post()
    @UseGuards(OptionalJwtAuthGuard)
    async createOrder(
        @Req() req: Request & { user: IJwtPayload | null },
        @Body() createOrderDto: CreateOrderDto,
    ) {
        const userId = req.user ? req.user.sub : null;
        const result = await this.orderService.createOrder(createOrderDto, userId);

        const mappedData = plainToInstance(OrderResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Order created successfully',
            data: mappedData,
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
