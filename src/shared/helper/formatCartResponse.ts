import { CartItem, Product, ProductVariant } from 'generated/prisma/client';

export function formatCartResponse(
    cartItem: CartItem & { product: Product; productVariant: ProductVariant },
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
