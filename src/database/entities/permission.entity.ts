import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolePermissionEntity } from './role-permission.entity';

@Entity({ name: 'permissions' })
export class PermissionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    resource: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    action: string | null;

    @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission)
    rolePermissions: RolePermissionEntity[];
}
