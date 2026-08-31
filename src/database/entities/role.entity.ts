import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity({ name: 'roles' })
export class RoleEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        name: 'created_at',
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date | null;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date | null;

    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date | null;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
    userRoles: UserRoleEntity[];

    @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.role)
    rolePermissions: RolePermissionEntity[];
}
