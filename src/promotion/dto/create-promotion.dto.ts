import {
    IsString,
    IsOptional,
    IsNumber,
    IsDateString,
    Min,
    IsNotEmpty,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
}

export class CreatePromotionDto {
    @IsNotEmpty()
    @IsString()
    code: string;

    @IsNotEmpty()
    @IsEnum(DiscountType, {
        message: 'Discount type must be either "percentage" or "fixed"',
    })
    type: DiscountType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    value: number;

    @IsDateString()
    startDate?: string;

    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    usageLimit?: number;
}
