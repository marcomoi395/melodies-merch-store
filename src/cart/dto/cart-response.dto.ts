import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import { ProductResponseDto } from 'src/products/dto/product-response.dto';

export class CartItemDto {
    @Expose()
    id: string;

    @Expose()
    cartId: string;

    @Expose()
    quantity: number;

    @Expose()
    @Type(() => ProductResponseDto)
    product: ProductResponseDto;
}

export class CartResponseDto {
    @Expose()
    id: string;

    @Expose()
    userId: string;

    @Expose()
    @Transform(
        ({ obj }) => {
            if (obj?.cartItems && Array.isArray(obj.cartItems)) {
                const mappedItems = obj.cartItems.map((item) => {
                    if (item.product && item.productVariant) {
                        item.product.productVariants = item.productVariant;
                    }
                    return item;
                });

                return plainToInstance(CartItemDto, mappedItems, {
                    excludeExtraneousValues: true,
                });
            }
        },
        { toClassOnly: true },
    )
    @Type(() => CartItemDto)
    cartItems: CartItemDto[];

    constructor(partial: Partial<CartItemDto>) {
        Object.assign(this, partial);
    }
}
