import { Permission, Role, RolePermission } from 'generated/prisma/browser';

export function formatRoleResponse(role: Role & { rolePermissions: RolePermission[] }) {
    const { rolePermissions, ...otherData } = role;

    const permissions = rolePermissions.map(
        (rp: RolePermission & { permission: Permission }) => rp.permission.name,
    );
    return {
        ...otherData,
        permissions,
    };
}
