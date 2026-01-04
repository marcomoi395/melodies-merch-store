import { applyDecorators } from '@nestjs/common';
import { Expose, Transform, Type } from 'class-transformer';

export function DecimalToNumber() {
    return applyDecorators(
        Type(() => String),

        Transform(({ value }) => {
            if (value === null || value === undefined) {
                return 0;
            }

            if (typeof value === 'object' && value !== null && 'toNumber' in value) {
                return value.toNumber();
            }

            return Number(value);
        }),
    );
}

export class ArtistDto {
    @Expose()
    id: string;

    @Expose()
    stageName: string;

    @Expose()
    avatarUrl: string;
}

export class AttributeDto {
    @Expose()
    key: string;

    @Expose()
    value: string;
}

export class ProductVariantDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    @DecimalToNumber()
    originalPrice: number;

    @Expose()
    @DecimalToNumber()
    discountPercent: number;

    @Expose()
    stockQuantity: number;

    @Expose()
    isPreorder: boolean;

    @Expose()
    @Type(() => AttributeDto)
    attributes: AttributeDto[];
}

export class CategoryResponseDto {
    @Expose()
    name: string;

    @Expose()
    slug: string;
}

export class ProductResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    slug: string;

    @Expose()
    shortDescription: string;

    @Expose()
    productType: string;

    @Expose()
    status: string;

    @Expose()
    @DecimalToNumber()
    minPrice: number;

    @Expose()
    @DecimalToNumber()
    maxPrice: number;

    @Expose()
    mediaGallery: string[];

    @Expose()
    @Transform(
        ({ obj }) => {
            if (obj?.productArtists && Array.isArray(obj?.productArtists)) {
                return obj.productArtists.map((pa) => pa.artist);
            }

            return [];
        },
        { toClassOnly: true },
    )
    @Type(() => ArtistDto)
    artists: ArtistDto[];

    @Expose()
    @Transform(({ obj }) => obj?.productVariants || [], { toClassOnly: true })
    @Type(() => ProductVariantDto)
    variants: ProductVariantDto[];

    @Expose()
    @Type(() => CategoryResponseDto)
    category: CategoryResponseDto;

    constructor(partial: Partial<ProductResponseDto>) {
        Object.assign(this, partial);
    }
}
