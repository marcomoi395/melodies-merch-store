import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItemEntity } from 'src/database/entities/cart-item.entity';
import { CartEntity } from 'src/database/entities/cart.entity';
import { ProductVariantEntity } from 'src/database/entities/product-variant.entity';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(CartEntity) private carts: Repository<CartEntity>,
        @InjectRepository(CartItemEntity) private cartItems: Repository<CartItemEntity>,
        private dataSource: DataSource,
    ) {}

    async getCart(userId: string) {
        const cart = await this.carts.findOne({
            where: { userId },
            relations: {
                cartItems: {
                    productVariant: { attributes: true },
                    product: { category: true, productArtists: { artist: true } },
                },
            },
        });
        if (cart) {
            return cart;
        }

        return this.carts.save(this.carts.create({ userId }));
    }

    async addItemToCart(userId: string, data: AddToCartDto) {
        const { productId, productVariantId, quantity } = data;

        await this.dataSource.transaction(async (tx) => {
            let cart = await tx.findOneBy(CartEntity, { userId });
            if (!cart) {
                cart = await tx.save(CartEntity, { userId });
            }

            const productVariant = await tx.findOne(ProductVariantEntity, {
                where: {
                    id: productVariantId,
                    deletedAt: IsNull(),
                    product: { deletedAt: IsNull() },
                },
            });

            if (!productVariant) {
                throw new NotFoundException('Product variant not found');
            }

            const currentCartItemQuantity = await tx.findOneBy(CartItemEntity, {
                cartId: cart.id,
                productVariantId,
            });

            if (
                data.quantity + (currentCartItemQuantity?.quantity ?? 0) >
                (productVariant.stockQuantity ?? 0)
            ) {
                throw new BadRequestException('Requested quantity exceeds available stock');
            }

            if (currentCartItemQuantity) {
                await tx.increment(
                    CartItemEntity,
                    { id: currentCartItemQuantity.id },
                    'quantity',
                    quantity,
                );
            } else {
                await tx.save(CartItemEntity, {
                    cartId: cart.id,
                    productId,
                    productVariantId,
                    quantity,
                });
            }
        });

        return this.getCart(userId);
    }

    async updateCartItemQuantity(userId: string, cartItemId: string, quantity: number) {
        await this.dataSource.transaction(async (tx) => {
            const cartItem = await tx.findOne(CartItemEntity, {
                where: {
                    id: cartItemId,
                    cart: { userId },
                    productVariant: { deletedAt: IsNull() },
                    product: { deletedAt: IsNull() },
                },
                relations: { productVariant: true },
            });

            if (!cartItem) {
                throw new NotFoundException('Cart item not found');
            }

            if (quantity <= 0) {
                return tx.delete(CartItemEntity, cartItemId);
            }

            if (quantity > (cartItem.productVariant?.stockQuantity ?? 0)) {
                throw new BadRequestException('Requested quantity exceeds available stock');
            }

            await tx.update(CartItemEntity, cartItemId, { quantity });
        });

        return this.getCart(userId);
    }

    async removeCartItem(userId: string, cartItemId: string) {
        const cartItem = await this.cartItems.findOne({
            where: {
                id: cartItemId,
                cart: { userId },
                productVariant: { deletedAt: IsNull() },
                product: { deletedAt: IsNull() },
            },
        });

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        await this.cartItems.delete(cartItemId);

        return this.getCart(userId);
    }
}
