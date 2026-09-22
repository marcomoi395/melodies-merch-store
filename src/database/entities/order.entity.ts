import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { DiscountUsageEntity } from './discount-usage.entity';
import { OrderItemEntity } from './order-item.entity';
import { TransactionEntity } from './transaction.entity';
import { UserEntity } from './user.entity';
@Entity({ name: 'orders' })
export class OrderEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId: string | null;
    @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
    @Column({ name: 'full_name', type: 'varchar', length: 100, nullable: true }) fullName:
        | string
        | null;
    @Column({ type: 'varchar', length: 20, nullable: true }) phone: string | null;
    @Column({ type: 'varchar', length: 20, nullable: true, default: 'PENDING' }) status:
        | string
        | null;
    @Column({ type: 'decimal' }) subtotal: string;
    @Column({ name: 'shipping_fee', type: 'decimal' }) shippingFee: string;
    @Column({ name: 'discount_amount', type: 'decimal', nullable: true, default: 0 })
    discountAmount: string | null;
    @Column({ name: 'total_amount', type: 'decimal' }) totalAmount: string;
    @Column({ type: 'varchar', length: 20, nullable: true, default: 'VND' }) currency:
        | string
        | null;
    @Column({ name: 'applied_voucher', type: 'varchar', nullable: true }) appliedVoucher:
        | string
        | null;
    @Column({ name: 'shipping_address', type: 'jsonb' }) shippingAddress: Record<string, unknown>;
    @Column({ name: 'tracking_code', type: 'varchar', length: 50, nullable: true }) trackingCode:
        | string
        | null;
    @Column({ type: 'text', nullable: true }) note: string | null;
    @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true }) paymentMethod:
        | string
        | null;
    @Column({
        name: 'created_at',
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date | null;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => UserEntity, (user) => user.orders, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserEntity | null;
    @OneToMany(() => OrderItemEntity, (item) => item.order) orderItems: OrderItemEntity[];
    @OneToMany(() => DiscountUsageEntity, (usage) => usage.order)
    discountUsages: DiscountUsageEntity[];

    @OneToMany(() => TransactionEntity, (transaction) => transaction.order)
    transactions: TransactionEntity[];
}
