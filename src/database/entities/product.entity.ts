import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { ProductArtistEntity } from './product-artist.entity';
import { ProductVariantEntity } from './product-variant.entity';

@Entity({ name: 'products' })
export class ProductEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ type: 'varchar', length: 255 }) name: string;
    @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) slug: string | null;
    @Column({ type: 'text', nullable: true }) description: string | null;
    @Column({ name: 'short_description', type: 'text', nullable: true }) shortDescription:
        | string
        | null;
    @Column({ name: 'category_id', type: 'uuid', nullable: true }) categoryId: string | null;
    @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'category_id', referencedColumnName: 'id' })
    category: CategoryEntity | null;
    @Column({ name: 'product_type', type: 'varchar', length: 20 }) productType: string;
    @Column({ type: 'varchar', length: 20, nullable: true, default: 'draft' }) status:
        | string
        | null;
    @Column({ name: 'min_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
    minPrice: string | null;
    @Column({ type: 'jsonb', nullable: true }) tracklist: unknown;
    @Column({ name: 'media_gallery', type: 'jsonb', nullable: true }) mediaGallery: unknown;
    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true }) deletedAt: Date | null;
    @Column({
        name: 'created_at',
        type: 'timestamp',
        precision: 3,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @OneToMany(() => ProductArtistEntity, (productArtist) => productArtist.product)
    productArtists: ProductArtistEntity[];
    @OneToMany(() => ProductVariantEntity, (variant) => variant.product)
    productVariants: ProductVariantEntity[];
}
