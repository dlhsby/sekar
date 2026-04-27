import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { PlantSpecies } from './plant-species.entity';

@Entity('area_plants')
@Unique('uq_area_plants_area_species', ['areaId', 'speciesId'])
export class AreaPlant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'area_id' })
  areaId: string;

  @Column({ type: 'uuid', name: 'species_id' })
  speciesId: string;

  @Column({ type: 'int', default: 0 })
  count: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_pruned_at' })
  lastPrunedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'next_due_at' })
  nextDueAt: Date | null;

  @Column({ type: 'text', default: 'ok' })
  status: 'ok' | 'due' | 'overdue';

  @Column({ type: 'int', nullable: true, name: 'override_cycle_days' })
  overrideCycleDays: number | null;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  area: Area;

  @ManyToOne(() => PlantSpecies, { onDelete: 'RESTRICT' })
  species: PlantSpecies;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
