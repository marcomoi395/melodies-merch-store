import { getMetadataArgsStorage } from 'typeorm';
import { ProductArtistEntity } from '../../src/database/entities/product-artist.entity';
import { ProductEntity } from '../../src/database/entities/product.entity';
import { ProductVariantEntity } from '../../src/database/entities/product-variant.entity';
import { VariantAttributeEntity } from '../../src/database/entities/variant-attribute.entity';

describe('product entity metadata', () => {
    it('preserves product SQL types, defaults, and relations', () => {
        const columns = getMetadataArgsStorage().columns;
        const product = columns.filter((column) => column.target === ProductEntity);
        const variants = columns.filter((column) => column.target === ProductVariantEntity);

        expect(product.find((column) => column.propertyName === 'minPrice')?.options).toEqual(
            expect.objectContaining({ name: 'min_price', precision: 12, scale: 2, nullable: true }),
        );
        expect(product.find((column) => column.propertyName === 'createdAt')?.options).toEqual(
            expect.objectContaining({
                name: 'created_at',
                precision: 3,
                default: expect.any(Function),
            }),
        );
        expect(product.find((column) => column.propertyName === 'updatedAt')?.options).toEqual(
            expect.objectContaining({ name: 'updated_at', precision: 3 }),
        );
        expect(
            product.find((column) => column.propertyName === 'categoryId')?.options.nullable,
        ).toBe(true);
        expect(variants.find((column) => column.propertyName === 'originalPrice')?.options).toEqual(
            expect.objectContaining({ name: 'original_price', precision: 15, scale: 2 }),
        );
        expect(
            variants.find((column) => column.propertyName === 'discountPercent')?.options,
        ).toEqual(expect.objectContaining({ name: 'discount_percent', precision: 15, scale: 2 }));
    });

    it('defines composite ProductArtist keys and cascading foreign keys', () => {
        const productArtistColumns = getMetadataArgsStorage().columns.filter(
            (column) => column.target === ProductArtistEntity,
        );
        expect(productArtistColumns.filter((column) => column.options.primary)).toHaveLength(2);
        expect(
            getMetadataArgsStorage().relations.filter(
                (relation) => relation.target === ProductArtistEntity,
            ),
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    propertyName: 'product',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
                expect.objectContaining({
                    propertyName: 'artist',
                    options: expect.objectContaining({ onDelete: 'CASCADE' }),
                }),
            ]),
        );
        expect(
            getMetadataArgsStorage().tables.some(
                (table) => table.target === VariantAttributeEntity,
            ),
        ).toBe(true);
        expect(getMetadataArgsStorage().relations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: ProductEntity,
                    propertyName: 'category',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
            ]),
        );
    });

    it('preserves product JSONB, uniqueness, and variant mappings', () => {
        const columns = getMetadataArgsStorage().columns;
        const productColumns = columns.filter((column) => column.target === ProductEntity);
        const variantColumns = columns.filter((column) => column.target === ProductVariantEntity);
        const attributeColumns = columns.filter(
            (column) => column.target === VariantAttributeEntity,
        );

        expect(productColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    propertyName: 'tracklist',
                    options: expect.objectContaining({ type: 'jsonb', nullable: true }),
                }),
                expect.objectContaining({
                    propertyName: 'mediaGallery',
                    options: expect.objectContaining({
                        name: 'media_gallery',
                        type: 'jsonb',
                        nullable: true,
                    }),
                }),
                expect.objectContaining({
                    propertyName: 'productType',
                    options: expect.objectContaining({ name: 'product_type', length: 20 }),
                }),
            ]),
        );
        expect(variantColumns.find((column) => column.propertyName === 'sku')?.options).toEqual(
            expect.objectContaining({ unique: true, length: 50 }),
        );
        expect(attributeColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    propertyName: 'variantId',
                    options: expect.objectContaining({ name: 'variant_id', type: 'uuid' }),
                }),
                expect.objectContaining({
                    propertyName: 'key',
                    options: expect.objectContaining({ length: 50 }),
                }),
                expect.objectContaining({
                    propertyName: 'value',
                    options: expect.objectContaining({ length: 100 }),
                }),
            ]),
        );
    });
});
