import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLogEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId: string | null;
    @Column({ type: 'varchar', length: 50 }) action: string;
    @Column({ type: 'varchar', length: 50 }) resource: string;
    @Column({ name: 'resource_id', type: 'varchar', nullable: true }) resourceId: string | null;
    @Column({ name: 'old_data', type: 'jsonb', nullable: true }) oldData: Record<
        string,
        unknown
    > | null;
    @Column({ name: 'new_data', type: 'jsonb', nullable: true }) newData: Record<
        string,
        unknown
    > | null;
    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }) ipAddress:
        | string
        | null;
    @Column({ name: 'user_agent', type: 'text', nullable: true }) userAgent: string | null;
    @Column({ name: 'created_at', type: 'timestamp', nullable: true }) createdAt: Date | null;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => UserEntity, (user) => user.auditLogs, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'actor_id', referencedColumnName: 'id' })
    actor: UserEntity | null;
}
