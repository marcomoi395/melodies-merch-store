import { CartItemEntity } from 'src/database/entities/cart-item.entity';
import { ProductEntity } from 'src/database/entities/product.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';

export function formatCartResponse(
    cartItem: CartItemEntity & { product: ProductEntity; productVariant: ProductVariantEntity },
) {
    const { product, productVariant, ...itemRest } = cartItem;

    return {
        ...itemRest,
        name: product?.name,
        slug: product?.slug,
        productType: product?.productType,
        mediaGallery: product?.mediaGallery,
        productVariant: {
            sku: productVariant?.sku,
            name: productVariant?.name,
            originalPrice: productVariant?.originalPrice,
            discountPercent: productVariant?.discountPercent,
            stockQuantity: productVariant?.stockQuantity,
            isPreorder: productVariant?.isPreorder,
        },
    };
}
