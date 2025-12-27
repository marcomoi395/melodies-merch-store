import { IsOptional, IsString, IsNumber, Min, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetProductsDto {
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    @Transform(({ value }) => {
        return (Array.isArray(value) ? value : [value]) as string[];
    })
    artistId?: string[];

    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    price_min?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    price_max?: number;

    @IsOptional()
    @IsString()
    sort?: string; // 'price_asc', 'newest', 'name_desc'

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    stock_status?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        return (Array.isArray(value) ? value : [value]) as string[];
    })
    type?: string[];
}
