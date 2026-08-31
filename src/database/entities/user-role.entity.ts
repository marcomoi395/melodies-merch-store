import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { RoleEntity } from './role.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_roles' })
export class UserRoleEntity {
    @PrimaryColumn({ name: 'user_id', type: 'uuid' })
    userId: string;

    @PrimaryColumn({ name: 'role_id', type: 'uuid' })
    roleId: string;

    @ManyToOne(() => UserEntity, (user) => user.userRoles, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserEntity;

    @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
    role: RoleEntity;
}
