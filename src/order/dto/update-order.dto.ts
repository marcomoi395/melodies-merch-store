import { IsNotEmpty, IsEnum } from 'class-validator';

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
}

export class UpdateOrderDto {
    @IsEnum(OrderStatus)
    @IsNotEmpty()
    status: OrderStatus;
}
