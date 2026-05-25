import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plant_species')
@Unique(['nameId'])
export class PlantSpecies {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'name_id' })
  nameId: string;

  @Column({ type: 'text', nullable: true, name: 'name_latin' })
  nameLatin: string | null;

  @Column({ type: 'text', default: 'tree' })
  category: 'tree' | 'shrub' | 'groundcover' | 'flower';

  @Column({ type: 'int', nullable: true, name: 'default_pruning_cycle_days' })
  defaultPruningCycleDays: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
