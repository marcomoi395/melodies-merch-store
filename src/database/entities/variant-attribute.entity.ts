import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductVariantEntity } from './product-variant.entity';

@Entity({ name: 'variant_attributes' })
export class VariantAttributeEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'variant_id', type: 'uuid' }) variantId: string;
    @Column({ name: 'key', type: 'varchar', length: 50 }) key: string;
    @Column({ name: 'value', type: 'varchar', length: 100 }) value: string;
    @ManyToOne(() => ProductVariantEntity, (variant) => variant.attributes, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'variant_id', referencedColumnName: 'id' })
    variant: ProductVariantEntity;
}
