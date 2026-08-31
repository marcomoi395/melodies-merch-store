import { getMetadataArgsStorage } from 'typeorm';
import { AuditLogEntity } from '../../src/database/entities/audit-log.entity';
import { PostEntity } from '../../src/database/entities/post.entity';

describe('content and audit entity metadata', () => {
    it('preserves post legacy mapping and audit JSON fields', () => {
        const columns = getMetadataArgsStorage().columns;
        const post = columns.filter((column) => column.target === PostEntity);
        const audit = columns.filter((column) => column.target === AuditLogEntity);

        expect(
            getMetadataArgsStorage().tables.find((table) => table.target === PostEntity)?.name,
        ).toBe('posts');
        expect(post.find((column) => column.propertyName === 'isPublished')?.options).toEqual(
            expect.objectContaining({ name: 'is_pulished', type: 'boolean', nullable: true }),
        );
        expect(post.find((column) => column.propertyName === 'slug')?.options.unique).toBe(true);
        expect(audit.find((column) => column.propertyName === 'oldData')?.options).toEqual(
            expect.objectContaining({ name: 'old_data', type: 'jsonb', nullable: true }),
        );
        expect(audit.find((column) => column.propertyName === 'ipAddress')?.options).toEqual(
            expect.objectContaining({ name: 'ip_address', length: 45, nullable: true }),
        );
    });

    it('preserves SET NULL author and actor relations', () => {
        expect(getMetadataArgsStorage().relations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: PostEntity,
                    propertyName: 'author',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
                expect.objectContaining({
                    target: AuditLogEntity,
                    propertyName: 'actor',
                    options: expect.objectContaining({ onDelete: 'SET NULL' }),
                }),
            ]),
        );
    });
});
