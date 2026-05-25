import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plant_seeds')
@Unique('uq_plant_seeds_name_id', ['nameId'])
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
