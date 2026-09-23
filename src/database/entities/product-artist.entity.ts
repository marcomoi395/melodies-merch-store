import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ArtistEntity } from './artist.entity';
import { ProductEntity } from './product.entity';

@Entity({ name: 'product_artists' })
export class ProductArtistEntity {
    @PrimaryColumn({ name: 'product_id', type: 'uuid' }) productId: string;
    @PrimaryColumn({ name: 'artist_id', type: 'uuid' }) artistId: string;
    @ManyToOne(() => ProductEntity, (product) => product.productArtists, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
    product: ProductEntity;
    @ManyToOne(() => ArtistEntity, (artist) => artist.productArtists, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'artist_id', referencedColumnName: 'id' })
    artist: ArtistEntity;
}
