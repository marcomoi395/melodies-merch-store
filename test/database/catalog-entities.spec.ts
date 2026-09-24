import { getMetadataArgsStorage } from 'typeorm';
import { ArtistEntity } from '../../src/database/entities/artist.entity';
import { CategoryEntity } from '../../src/database/entities/category.entity';

describe('artist and category entity metadata', () => {
    it('maps catalog tables and category self-reference', () => {
        const tables = getMetadataArgsStorage().tables;
        expect(tables.find((table) => table.target === ArtistEntity)?.name).toBe('artists');
        expect(tables.find((table) => table.target === CategoryEntity)?.name).toBe('categories');

        const categoryRelations = getMetadataArgsStorage().relations.filter(
            (relation) => relation.target === CategoryEntity,
        );
        expect(categoryRelations.map((relation) => relation.propertyName)).toEqual(
            expect.arrayContaining(['parent', 'children']),
        );
        expect(
            getMetadataArgsStorage().relations.find(
                (relation) => relation.propertyName === 'parent',
            )?.options.onDelete,
        ).toBe('SET NULL');
    });
    it('preserves exact catalog columns and constraints', () => {
        const columns = getMetadataArgsStorage().columns;
        const artistColumns = columns
            .filter((column) => column.target === ArtistEntity)
            .map((column) => ({
                propertyName: column.propertyName,
                name: column.options.name ?? column.propertyName,
            }));
        const categoryColumns = columns
            .filter((column) => column.target === CategoryEntity)
            .map((column) => ({
                propertyName: column.propertyName,
                name: column.options.name ?? column.propertyName,
            }));

        expect(artistColumns).toEqual(
            expect.arrayContaining([
                { propertyName: 'stageName', name: 'stage_name' },
                { propertyName: 'slug', name: 'slug' },
                { propertyName: 'avatarUrl', name: 'avatar_url' },
                { propertyName: 'metadata', name: 'metadata' },
                { propertyName: 'deletedAt', name: 'deleted_at' },
            ]),
        );
        expect(categoryColumns).toEqual(
            expect.arrayContaining([
                { propertyName: 'parentId', name: 'parent_id' },
                { propertyName: 'slug', name: 'slug' },
            ]),
        );
        expect(
            columns.find(
                (column) => column.target === ArtistEntity && column.propertyName === 'slug',
            )?.options.unique,
        ).toBe(true);
        expect(
            columns.find(
                (column) => column.target === CategoryEntity && column.propertyName === 'slug',
            )?.options.unique,
        ).toBe(true);
    });

    it('preserves catalog nullability and defaults', () => {
        const columns = getMetadataArgsStorage().columns;
        const artistColumns = columns.filter((column) => column.target === ArtistEntity);
        const categoryColumns = columns.filter((column) => column.target === CategoryEntity);

        expect(artistColumns.find((column) => column.propertyName === 'status')?.options).toEqual(
            expect.objectContaining({ nullable: true, default: 'active' }),
        );
        expect(artistColumns.find((column) => column.propertyName === 'metadata')?.options).toEqual(
            expect.objectContaining({ type: 'jsonb', nullable: true }),
        );
        expect(
            categoryColumns.find((column) => column.propertyName === 'parentId')?.options,
        ).toEqual(expect.objectContaining({ name: 'parent_id', type: 'uuid', nullable: true }));
    });
});
