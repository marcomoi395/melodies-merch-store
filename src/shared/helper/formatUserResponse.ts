import { UserRole, Role, RolePermission, Permission, User } from 'generated/prisma/browser';

export function formatPermission(user: User & { userRoles: UserRole[] }) {
    const { userRoles, ...otherInfo } = user;

    return {
        ...otherInfo,
        roles: userRoles.map(
            (ur: UserRole & { role: Role & { rolePermissions: RolePermission[] } }) => ({
                id: ur.role.id,
                name: ur.role.name,
                permissions: ur.role.rolePermissions.map(
                    (rp: RolePermission & { permission: Permission }) => {
                        const p = rp.permission;
                        return p.resource && p.action ? `${p.resource}.${p.action}` : p.name;
                    },
                ),
            }),
        ),
    };
}
