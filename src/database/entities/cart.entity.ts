import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CartItemEntity } from './cart-item.entity';

@Entity({ name: 'carts' })
export class CartEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true }) userId: string | null;
    @Column({
        name: 'created_at',
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date | null;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => UserEntity, (user) => user.carts, {
        nullable: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserEntity | null;
    @OneToMany(() => CartItemEntity, (item) => item.cart) cartItems: CartItemEntity[];
}
