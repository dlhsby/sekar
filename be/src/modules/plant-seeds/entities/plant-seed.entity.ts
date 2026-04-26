import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('plant_seeds')
export class PlantSeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'name_id' })
  nameId: string;

  @Column({ type: 'uuid', nullable: true, name: 'species_id' })
  speciesId: string | null;

  @Column({ type: 'text' })
  unit: 'gram' | 'piece' | 'packet';

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'stock_qty' })
  stockQty: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_counted_at' })
  lastCountedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
