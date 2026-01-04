import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { ProductResponseDto } from 'src/products/dto/product-response.dto';

export class ArtistResponseDto {
    @Expose()
    id: string;

    @Expose()
    stageName: string;

    @Expose()
    slug: string;

    @Expose()
    bio: string;

    @Expose()
    avatarUrl: string;

    @Expose()
    @Transform(({ value }) => value || {})
    metadata: any;

    @Expose()
    @Transform(
        ({ obj }) => {
            if (obj?.productArtists && Array.isArray(obj.productArtists)) {
                const raw = obj.productArtists.map((e) => e.product).filter((product) => product);

                return plainToInstance(ProductResponseDto, raw, { excludeExtraneousValues: true });
            }
        },
        { toClassOnly: true },
    )
    @Type(() => ProductResponseDto)
    products: ProductResponseDto[];

    constructor(partial: Partial<ArtistResponseDto>) {
        Object.assign(this, partial);
    }
}
