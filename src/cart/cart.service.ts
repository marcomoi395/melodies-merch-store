import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) {}

    async getCart(userId: string) {
        const cart = await this.prisma.cart.findFirst({
            where: { userId },
            select: {
                id: true,
                userId: true,
                cartItems: {
                    select: {
                        id: true,
                        cartId: true,
                        quantity: true,
                        productVariant: {
                            select: {
                                id: true,
                                name: true,
                                originalPrice: true,
                                discountPercent: true,
                                isPreorder: true,
                                stockQuantity: true,
                                attributes: {
                                    select: {
                                        key: true,
                                        value: true,
                                    },
                                },
                            },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                shortDescription: true,
                                productType: true,
                                status: true,
                                mediaGallery: true,
                                category: {
                                    select: {
                                        name: true,
                                        slug: true,
                                    },
                                },
                                productArtists: {
                                    where: {
                                        artist: { deletedAt: null },
                                    },
                                    select: {
                                        artist: {
                                            select: {
                                                id: true,
                                                stageName: true,
                                                avatarUrl: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (cart) {
            return cart;
        }

        return await this.prisma.cart.create({
            data: {
                userId,
            },
        });
    }

    async addItemToCart(userId: string, data: AddToCartDto) {
        const { productId, productVariantId, quantity } = data;

        await this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.upsert({
                where: { userId },
                update: {},
                create: { userId },
            });

            const productVariant = await tx.productVariant.findUnique({
                where: {
                    id: productVariantId,
                    deletedAt: null,
                    product: { deletedAt: null },
                },
                select: { stockQuantity: true },
            });

            if (!productVariant) {
                throw new NotFoundException('Product variant not found');
            }

            const currentCartItemQuantity = await tx.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    productVariantId,
                },
                select: { quantity: true },
            });

            if (
                data.quantity + (currentCartItemQuantity?.quantity ?? 0) >
                (productVariant.stockQuantity ?? 0)
            ) {
                throw new BadRequestException('Requested quantity exceeds available stock');
            }

            // 4. Upsert CartItem
            await tx.cartItem.upsert({
                where: {
                    cartId_productId_productVariantId: {
                        cartId: cart.id,
                        productId,
                        productVariantId,
                    },
                },
                update: {
                    quantity: { increment: quantity },
                },
                create: {
                    cartId: cart.id,
                    productId,
                    productVariantId,
                    quantity: quantity,
                },
            });
        });

        return this.getCart(userId);
    }

    async updateCartItemQuantity(userId: string, cartItemId: string, quantity: number) {
        await this.prisma.$transaction(async (tx) => {
            const cartItem = await tx.cartItem.findFirst({
                where: {
                    id: cartItemId,
                    cart: { userId },
                    productVariant: {
                        deletedAt: null,
                    },
                    product: {
                        deletedAt: null,
                    },
                },
                include: {
                    cart: true,
                    productVariant: {
                        select: { stockQuantity: true },
                    },
                },
            });

            if (!cartItem) {
                throw new NotFoundException('Cart item not found');
            }

            if (quantity <= 0) {
                return await tx.cartItem.delete({
                    where: { id: cartItemId },
                });
            }

            if (quantity > (cartItem.productVariant?.stockQuantity ?? 0)) {
                throw new BadRequestException('Requested quantity exceeds available stock');
            }

            await tx.cartItem.update({
                where: { id: cartItemId },
                data: { quantity },
            });
        });

        return this.getCart(userId);
    }

    async removeCartItem(userId: string, cartItemId: string) {
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                id: cartItemId,
                cart: { userId },
                productVariant: {
                    deletedAt: null,
                },
                product: {
                    deletedAt: null,
                },
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        await this.prisma.cartItem.delete({
            where: { id: cartItemId },
        });

        return this.getCart(userId);
    }
}
