import { Type } from 'class-transformer';
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
import { AttributeKey, ProductType } from './create-product.dto';

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

export class UpdateVariantDto {
    @IsOptional()
    @IsUUID('4')
    id: string;

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
    discountPercent: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    stockQuantity: number;

    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductAttributeDto)
    attributes: ProductAttributeDto[];

    @IsOptional()
    @IsBoolean()
    isPreorder?: boolean;
}

export class UpdateProductDto {
    @IsOptional()
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

    @IsOptional()
    @IsEnum(ProductType, {
        message: `ProductType must be one of: ${Object.values(ProductType).join(', ')}`,
    })
    productType: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mediaGallery?: string[];

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    artistIds?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVariantDto)
    variants: UpdateVariantDto[];
}
