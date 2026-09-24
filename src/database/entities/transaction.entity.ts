import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity({ name: 'transactions' })
export class TransactionEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'order_id', type: 'uuid', nullable: true }) orderId: string | null;
    @Column({ type: 'varchar', nullable: true }) type: string | null;
    @Column({ type: 'varchar', nullable: true }) provider: string | null;
    @Column({ name: 'gateway_transaction_id', type: 'varchar', nullable: true })
    gatewayTransactionId: string | null;
    @Column({ type: 'decimal', nullable: true }) amount: string | null;
    @Column({ type: 'varchar', nullable: true }) status: string | null;
    @Column({ name: 'raw_response', type: 'jsonb', nullable: true }) rawResponse: Record<
        string,
        unknown
    > | null;
    @Column({ name: 'created_at', type: 'timestamp', nullable: true }) createdAt: Date | null;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => OrderEntity, (order) => order.transactions, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
    order: OrderEntity | null;
}
