import { PermissionEntity } from 'src/database/entities/permission.entity';
import { RolePermissionEntity } from 'src/database/entities/role-permission.entity';
import { RoleEntity } from 'src/database/entities/role.entity';

export function formatRoleResponse(role: RoleEntity & { rolePermissions: RolePermissionEntity[] }) {
    const { rolePermissions, ...otherData } = role;

    const permissions = rolePermissions.map(
        (rp: RolePermissionEntity & { permission: PermissionEntity }) => rp.permission.name,
    );
    return {
        ...otherData,
        permissions,
    };
}
