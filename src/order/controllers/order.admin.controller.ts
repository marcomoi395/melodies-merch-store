import {
    Controller,
    Get,
    UseGuards,
    Patch,
    Body,
    Param,
    ParseUUIDPipe,
    Query,
} from '@nestjs/common';
import { OrderService } from '../order.service';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { AuthGuard } from '@nestjs/passport';
import { GetOrdersDto } from '../dto/get-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Controller('admin/order')
export class OrderAdminController {
    constructor(private readonly orderService: OrderService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('ORDER', 'VIEW')
    async getAllOrders(@Query() query: GetOrdersDto) {
        const result = await this.orderService.getOrdersForAdmin(query);

        return {
            statusCode: 200,
            message: 'Orders retrieved successfully',
            data: result,
        };
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('ORDER', 'VIEW')
    async getOrderDetailForAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
        const result = await this.orderService.getOrderDetailForAdmin(id);

        return {
            statusCode: 200,
            message: 'Order detail retrieved successfully',
            data: result,
        };
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), PermissionGuard)
    @RequiredPermission('ORDER', 'UPDATE_STATUS')
    async changeOrderStatusForAdmin(
        @Body() body: UpdateOrderDto,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        const result = await this.orderService.changeOrderStatusForAdmin(id, body.status);

        return {
            statusCode: 200,
            message: 'Order status updated successfully',
            data: result,
        };
    }
}
