import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { OrderItemDto } from './create-order.dto';

export class PreviewOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsString()
    @IsOptional()
    appliedVoucher?: string;

    @IsString()
    @IsNotEmpty()
    shippingAddress: string;
}
