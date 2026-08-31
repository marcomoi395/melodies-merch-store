import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { ProductEntity } from './product.entity';
import { VariantAttributeEntity } from './variant-attribute.entity';

@Entity({ name: 'product_variants' })
export class ProductVariantEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'product_id', type: 'uuid', nullable: true }) productId: string | null;
    @Column({ type: 'varchar', length: 50, unique: true }) sku: string;
    @Column({ type: 'varchar', length: 100 }) name: string;
    @Column({ name: 'original_price', type: 'decimal', precision: 15, scale: 2 })
    originalPrice: string;
    @Column({
        name: 'discount_percent',
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true,
        default: 0,
    })
    discountPercent: string | null;
    @Column({ name: 'stock_quantity', type: 'integer', nullable: true, default: 0 }) stockQuantity:
        | number
        | null;
    @Column({ name: 'is_preorder', type: 'boolean', nullable: true, default: false }) isPreorder:
        | boolean
        | null;
    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true }) deletedAt: Date | null;
    @Column({
        name: 'created_at',
        type: 'timestamp',
        precision: 3,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;
    @Column({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => ProductEntity, (product) => product.productVariants, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
    product: ProductEntity | null;
    @OneToMany(() => VariantAttributeEntity, (attribute) => attribute.variant)
    attributes: VariantAttributeEntity[];
}
