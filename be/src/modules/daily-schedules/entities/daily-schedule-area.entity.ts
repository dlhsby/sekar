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
import { DailySchedule } from './daily-schedule.entity';

/**
 * Areas assigned to a worker for a given day (0..N). Join table so a day can
 * cover several areas and the geofence/monitoring code can `leftJoinAndSelect`
 * the real Area entities.
 */
@Entity('daily_schedule_areas')
@Index('IDX_daily_schedule_areas_area', ['area_id'])
@Index('UQ_daily_schedule_areas', ['daily_schedule_id', 'area_id'], { unique: true })
export class DailyScheduleArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  daily_schedule_id: string;

  @Column({ type: 'uuid' })
  area_id: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;

  @ManyToOne(() => DailySchedule, (ds) => ds.daily_schedule_areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'daily_schedule_id' })
  daily_schedule: DailySchedule;

  @ManyToOne(() => Area, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;
}
