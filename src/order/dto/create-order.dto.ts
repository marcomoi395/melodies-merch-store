import { Type } from 'class-transformer';
import {
    IsArray,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';

export enum PaymentMethod {
    COD = 'COD',
    MOMO = 'MOMO',
}

class CustomerInfoDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;
}

class OrderItemDto {
    @IsUUID()
    @IsNotEmpty()
    productVariantId: string;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto extends CustomerInfoDto {
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

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsString()
    @IsOptional()
    note?: string;
}
