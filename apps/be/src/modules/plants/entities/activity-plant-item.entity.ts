import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Activity } from '../../activities/entities/activity.entity';
import { PlantSpecies } from './plant-species.entity';

@Entity('activity_plant_items')
export class ActivityPlantItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'activity_id' })
  activityId: string;

  @Column({ type: 'uuid', name: 'species_id' })
  speciesId: string;

  @Column({ type: 'int' })
  count: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  activity: Activity;

  @ManyToOne(() => PlantSpecies, { onDelete: 'RESTRICT' })
  species: PlantSpecies;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
