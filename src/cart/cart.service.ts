import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { formatCartResponse } from 'src/shared/helper/formatCartResponse';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) {}

    async getCart(userId: string) {
        const cart = await this.prisma.cart.findFirst({
            where: { userId },
            include: {
                cartItems: {
                    include: {
                        product: true,
                        productVariant: true,
                    },
                },
            },
        });

        if (cart) {
            const { cartItems, ...rest } = cart;

            const validItems = cartItems.filter((item) => item.product && item.productVariant);

            return {
                ...rest,
                cartItems: validItems.map((item) => formatCartResponse(item as any)),
            };
        }

        return await this.prisma.cart.create({
            data: {
                userId,
            },
        });
    }

    async addItemToCart(userId: string, data: AddToCartDto) {
        const { productId, productVariantId, quantity } = data;

        const cart = await this.prisma.cart.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });

        const productVariant = await this.prisma.productVariant.findUnique({
            where: {
                id: productVariantId,
                deletedAt: null,
                product: {
                    deletedAt: null,
                },
            },
            select: {
                stockQuantity: true,
            },
        });

        const currentCartItemQuantity = await this.prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productVariantId,
            },
            select: {
                quantity: true,
            },
        });

        if (productVariant === null) {
            throw new NotFoundException('Product variant not found');
        }

        if (
            data.quantity + (currentCartItemQuantity?.quantity ?? 0) >
            (productVariant?.stockQuantity ?? 0)
        ) {
            throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const result = await this.prisma.cartItem.upsert({
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
            include: {
                product: true,
                productVariant: true,
            },
        });

        return formatCartResponse(result as any);
    }

    async updateCartItemQuantity(userId: string, cartItemId: string, quantity: number) {
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
            return await this.prisma.cartItem.delete({
                where: { id: cartItemId },
            });
        }

        if (quantity > (cartItem.productVariant?.stockQuantity ?? 0)) {
            throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const result = await this.prisma.cartItem.update({
            where: { id: cartItemId },
            data: { quantity },
            include: {
                productVariant: true,
                product: true,
            },
        });

        return formatCartResponse(result as any);
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
    }
}
