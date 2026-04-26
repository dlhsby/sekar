import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { PlantSpecies } from './plant-species.entity';

@Entity('notable_plants')
export class NotablePlant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'area_id' })
  areaId: string;

  @Column({ type: 'uuid', name: 'species_id' })
  speciesId: string;

  @Column({ type: 'numeric', precision: 10, scale: 8, name: 'gps_lat' })
  gpsLat: number;

  @Column({ type: 'numeric', precision: 11, scale: 8, name: 'gps_lng' })
  gpsLng: number;

  @Column({ type: 'text', nullable: true })
  label: string | null;

  @Column({ type: 'boolean', default: false })
  heritage: boolean;

  @Column({ type: 'text', array: true, default: '{}', name: 'photo_urls' })
  photoUrls: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  area: Area;

  @ManyToOne(() => PlantSpecies, { onDelete: 'RESTRICT' })
  species: PlantSpecies;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
