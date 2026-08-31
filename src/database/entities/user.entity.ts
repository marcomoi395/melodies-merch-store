import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRoleEntity } from './user-role.entity';

@Entity({ name: 'users' })
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ name: 'password_hash', type: 'varchar', nullable: true })
    passwordHash: string | null;

    @Column({ name: 'full_name', type: 'varchar', length: 100, nullable: true })
    fullName: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
    avatarUrl: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true, default: 'local' })
    provider: string | null;

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

    @Column({ type: 'varchar', length: 20, nullable: true, default: 'active' })
    status: string | null;

    @Column({ name: 'is_verified', type: 'boolean', nullable: true, default: false })
    isVerified: boolean | null;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
    userRoles: UserRoleEntity[];
}
