import { getMetadataArgsStorage } from 'typeorm';
import { PermissionEntity } from '../../src/database/entities/permission.entity';
import { RoleEntity } from '../../src/database/entities/role.entity';
import { RolePermissionEntity } from '../../src/database/entities/role-permission.entity';
import { UserEntity } from '../../src/database/entities/user.entity';
import { UserRoleEntity } from '../../src/database/entities/user-role.entity';

describe('identity entity metadata', () => {
    it('maps identity tables and composite keys', () => {
        const tables = getMetadataArgsStorage().tables;
        expect(tables.find((table) => table.target === UserEntity)?.name).toBe('users');
        expect(tables.find((table) => table.target === RoleEntity)?.name).toBe('roles');
        expect(tables.find((table) => table.target === PermissionEntity)?.name).toBe('permissions');
        expect(tables.find((table) => table.target === UserRoleEntity)?.name).toBe('user_roles');
        expect(tables.find((table) => table.target === RolePermissionEntity)?.name).toBe(
            'role_permissions',
        );

        const compositeColumns = getMetadataArgsStorage().columns.filter(
            (column) => column.target === UserRoleEntity || column.target === RolePermissionEntity,
        );
        expect(compositeColumns.filter((column) => column.options.primary)).toHaveLength(4);
        expect(compositeColumns.map((column) => column.propertyName)).toEqual(
            expect.arrayContaining(['userId', 'roleId', 'permissionId']),
        );
        expect(
            getMetadataArgsStorage().relations.some(
                (relation) => relation.target === UserRoleEntity,
            ),
        ).toBe(true);
        expect(
            getMetadataArgsStorage().relations.some(
                (relation) => relation.target === RolePermissionEntity,
            ),
        ).toBe(true);
    });

    it('preserves identity column mappings and cascade actions', () => {
        const columns = getMetadataArgsStorage().columns;
        const userColumns = columns.filter((column) => column.target === UserEntity);

        expect(userColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    propertyName: 'passwordHash',
                    options: expect.objectContaining({ name: 'password_hash', nullable: true }),
                }),
                expect.objectContaining({
                    propertyName: 'fullName',
                    options: expect.objectContaining({ name: 'full_name', nullable: true }),
                }),
                expect.objectContaining({
                    propertyName: 'isVerified',
                    options: expect.objectContaining({ name: 'is_verified', default: false }),
                }),
            ]),
        );

        const foreignKeys = getMetadataArgsStorage()
            .relations.filter(
                (relation) =>
                    relation.target === UserRoleEntity || relation.target === RolePermissionEntity,
            )
            .map((relation) => relation.options.onDelete);

        expect(foreignKeys).toEqual(['CASCADE', 'CASCADE', 'CASCADE', 'CASCADE']);
    });
});
