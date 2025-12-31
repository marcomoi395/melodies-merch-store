import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from './update-order.dto';

export class GetOrdersDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    sort?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
