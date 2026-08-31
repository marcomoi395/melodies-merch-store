import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { ProductEntity } from './product.entity';
import { ProductVariantEntity } from './product-variant.entity';

@Entity({ name: 'order_items' })
export class OrderItemEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'order_id', type: 'uuid', nullable: true }) orderId: string | null;
    @Column({ name: 'product_id', type: 'uuid', nullable: true }) productId: string | null;
    @Column({ name: 'product_variant_id', type: 'uuid', nullable: true }) productVariantId:
        | string
        | null;
    @Column({ name: 'product_name', type: 'varchar' }) productName: string;
    @Column({ name: 'variant_name', type: 'varchar' }) variantName: string;
    @Column({ type: 'integer' }) quantity: number;
    @Column({ type: 'decimal' }) price: string;
    @Column({ name: 'original_price', type: 'decimal' }) originalPrice: string;
    @Column({ name: 'discount_percentage', type: 'decimal' }) discountPercentage: string;
    @Column({ name: 'total_line_price', type: 'decimal' }) totalLinePrice: string;
    @ManyToOne(() => OrderEntity, (order) => order.orderItems, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
    order: OrderEntity | null;
    @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
    product: ProductEntity | null;
    @ManyToOne(() => ProductVariantEntity, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'product_variant_id', referencedColumnName: 'id' })
    productVariant: ProductVariantEntity | null;
}
