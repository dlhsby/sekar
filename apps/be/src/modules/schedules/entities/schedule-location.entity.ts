import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Location } from '../../locations/entities/location.entity';
import { Schedule } from './schedule.entity';

/**
 * Areas assigned to a worker for a given day (0..N). Join table so a day can
 * cover several areas and the geofence/monitoring code can `leftJoinAndSelect`
 * the real Location entities.
 */
@Entity('schedule_locations')
@Index('IDX_schedule_locations_area', ['location_id'])
@Index('UQ_schedule_locations', ['schedule_id', 'location_id'], { unique: true })
export class ScheduleLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  schedule_id: string;

  @Column({ type: 'uuid' })
  location_id: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;

  @ManyToOne(() => Schedule, (ds) => ds.schedule_locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @ManyToOne(() => Location, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  area: Location;
}
