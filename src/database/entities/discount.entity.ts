import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DiscountUsageEntity } from './discount-usage.entity';

@Entity({ name: 'discounts' })
export class DiscountEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ type: 'varchar', length: 50, nullable: true, unique: true }) code: string | null;
    @Column({ type: 'text', nullable: true }) description: string | null;
    @Column({ type: 'varchar', length: 20, nullable: true }) type: string | null;
    @Column({ type: 'decimal' }) value: string;
    @Column({ name: 'start_date', type: 'timestamp', nullable: true }) startDate: Date | null;
    @Column({ name: 'end_date', type: 'timestamp', nullable: true }) endDate: Date | null;
    @Column({ name: 'usage_limit', type: 'integer', nullable: true }) usageLimit: number | null;
    @Column({ name: 'used_count', type: 'integer', nullable: true, default: 0 }) usedCount:
        | number
        | null;
    @Column({ name: 'is_active', type: 'boolean', nullable: true, default: true }) isActive:
        | boolean
        | null;
    @Column({ name: 'applies_to', type: 'varchar', length: 20, nullable: true, default: 'all' })
    appliesTo: string | null;
    @Column({
        name: 'created_at',
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date | null;
    @Column({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true }) deletedAt: Date | null;
    @OneToMany(() => DiscountUsageEntity, (usage) => usage.discount)
    discountUsages: DiscountUsageEntity[];
}
