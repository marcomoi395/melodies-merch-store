import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'posts' })
export class PostEntity {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ type: 'varchar', length: 255 }) title: string;
    @Column({ type: 'varchar', length: 255, nullable: true, unique: true }) slug: string | null;
    @Column({ type: 'text', nullable: true }) content: string | null;
    @Column({ name: 'author_id', type: 'uuid', nullable: true }) authorId: string | null;
    @Column({ name: 'published_at', type: 'timestamp', nullable: true }) publishedAt: Date | null;
    @Column({ name: 'is_pulished', type: 'boolean', nullable: true }) isPublished: boolean | null;
    @Column({ name: 'created_at', type: 'timestamp', nullable: true }) createdAt: Date | null;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 3 }) updatedAt: Date;
    @ManyToOne(() => UserEntity, (user) => user.posts, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'author_id', referencedColumnName: 'id' })
    author: UserEntity | null;
}
