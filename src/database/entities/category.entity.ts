import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'categories' })
export class CategoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
    slug: string | null;

    @Column({ name: 'parent_id', type: 'uuid', nullable: true })
    parentId: string | null;

    @ManyToOne(() => CategoryEntity, (category) => category.children, {
        nullable: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'parent_id', referencedColumnName: 'id' })
    parent: CategoryEntity | null;

    @OneToMany(() => CategoryEntity, (category) => category.parent)
    children: CategoryEntity[];
}
