import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
    MUSIC = 'music',
    MERCH = 'merch',
}
export enum AttributeKey {
    SIZE = 'Size',
    COLOR = 'Color',
    MATERIAL = 'Material',
    EDITION = 'Edition',
    FORMAT = 'Format',
    SPEED = 'Speed',
}

export class ProductAttributeDto {
    @IsNotEmpty()
    @IsEnum(AttributeKey, {
        message: `Key must be one of: ${Object.values(AttributeKey).join(', ')}`,
    })
    key: AttributeKey;

    @IsNotEmpty()
    @IsString()
    value: string;
}

export class CreateProductVariantDto {
    @IsNotEmpty()
    @IsString()
    sku: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    originalPrice: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercent?: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    stockQuantity: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductAttributeDto)
    attributes?: ProductAttributeDto[];

    @IsOptional()
    @IsBoolean()
    isPreorder?: boolean;
}

export class CreateProductDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    shortDescription?: string;

    @IsOptional()
    @IsUUID()
    categoryId: string;

    @IsNotEmpty()
    @IsEnum(ProductType, {
        message: `ProductType must be one of: ${Object.values(ProductType).join(', ')}`,
    })
    productType: string;

    @IsOptional()
    mediaGallery?: string[];

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    artistIds?: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductVariantDto)
    variants: CreateProductVariantDto[];
}
