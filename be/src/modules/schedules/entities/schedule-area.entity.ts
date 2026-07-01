import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { Schedule } from './schedule.entity';

/**
 * Areas assigned to a worker for a given day (0..N). Join table so a day can
 * cover several areas and the geofence/monitoring code can `leftJoinAndSelect`
 * the real Area entities.
 */
@Entity('schedule_areas')
@Index('IDX_schedule_areas_area', ['area_id'])
@Index('UQ_schedule_areas', ['schedule_id', 'area_id'], { unique: true })
export class ScheduleArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  schedule_id: string;

  @Column({ type: 'uuid' })
  area_id: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;

  @ManyToOne(() => Schedule, (ds) => ds.schedule_areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  @ManyToOne(() => Area, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;
}
