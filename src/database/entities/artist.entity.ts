import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'artists' })
export class ArtistEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'stage_name', type: 'varchar', length: 255 })
    stageName: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    bio: string | null;

    @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
    avatarUrl: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ type: 'varchar', length: 20, nullable: true, default: 'active' })
    status: string | null;

    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date | null;
}
