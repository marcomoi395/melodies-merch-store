import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CartEntity } from './cart.entity';
import { ProductEntity } from './product.entity';
import { ProductVariantEntity } from './product-variant.entity';

@Entity({ name: 'cart_items' })
@Unique('cart_items_cart_id_product_id_product_variant_id_key', [
    'cartId',
    'productId',
    'productVariantId',
])
export class CartItemEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'cart_id', type: 'uuid', nullable: true }) cartId: string | null;
    @Column({ name: 'product_id', type: 'uuid', nullable: true }) productId: string | null;
    @Column({ name: 'product_variant_id', type: 'uuid', nullable: true }) productVariantId:
        | string
        | null;
    @Column({ type: 'integer', nullable: true, default: 1 }) quantity: number | null;
    @ManyToOne(() => CartEntity, (cart) => cart.cartItems, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'cart_id', referencedColumnName: 'id' })
    cart: CartEntity | null;
    @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
    product: ProductEntity | null;
    @ManyToOne(() => ProductVariantEntity, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'product_variant_id', referencedColumnName: 'id' })
    productVariant: ProductVariantEntity | null;
}
