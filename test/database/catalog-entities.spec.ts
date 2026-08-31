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
});
