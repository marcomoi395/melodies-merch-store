import { PermissionEntity } from 'src/database/entities/permission.entity';
import { RolePermissionEntity } from 'src/database/entities/role-permission.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { UserRoleEntity } from 'src/database/entities/user-role.entity';
import { UserEntity } from 'src/database/entities/user.entity';

export function formatPermission(user: UserEntity & { userRoles: UserRoleEntity[] }) {
    const { userRoles, ...otherInfo } = user;

    return {
        ...otherInfo,
        roles: userRoles.map(
            (
                ur: UserRoleEntity & {
                    role: RoleEntity & { rolePermissions: RolePermissionEntity[] };
                },
            ) => ({
                id: ur.role.id,
                name: ur.role.name,
                permissions: ur.role.rolePermissions.map(
                    (rp: RolePermissionEntity & { permission: PermissionEntity }) => {
                        const p = rp.permission;
                        return p.resource && p.action ? `${p.resource}.${p.action}` : p.name;
                    },
                ),
            }),
        ),
    };
}
