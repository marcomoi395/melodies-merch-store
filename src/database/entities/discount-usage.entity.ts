import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DiscountEntity } from './discount.entity';
import { UserEntity } from './user.entity';
import { OrderEntity } from './order.entity';

@Entity({ name: 'discount_usages' })
export class DiscountUsageEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'discount_id', type: 'uuid', nullable: true }) discountId: string | null;
    @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId: string | null;
    @Column({ name: 'order_id', type: 'uuid', nullable: true }) orderId: string | null;
    @Column({
        name: 'used_at',
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    usedAt: Date | null;
    @ManyToOne(() => DiscountEntity, (discount) => discount.discountUsages, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'discount_id', referencedColumnName: 'id' })
    discount: DiscountEntity | null;
    @ManyToOne(() => UserEntity, (user) => user.discountUsages, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserEntity | null;
    @ManyToOne(() => OrderEntity, (order) => order.discountUsages, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
    order: OrderEntity | null;
}
