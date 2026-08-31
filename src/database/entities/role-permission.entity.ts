import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PermissionEntity } from './permission.entity';
import { RoleEntity } from './role.entity';

@Entity({ name: 'role_permissions' })
export class RolePermissionEntity {
    @PrimaryColumn({ name: 'role_id', type: 'uuid' })
    roleId: string;

    @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
    permissionId: string;

    @ManyToOne(() => RoleEntity, (role) => role.rolePermissions, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
    role: RoleEntity;

    @ManyToOne(() => PermissionEntity, (permission) => permission.rolePermissions, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'permission_id', referencedColumnName: 'id' })
    permission: PermissionEntity;
}
