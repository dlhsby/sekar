import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Overtime } from './overtime.entity';
import { ActivityType } from '../../activity-types/entities/activity-type.entity';

@Entity('overtime_aktivitas')
export class OvertimeAktivitas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  overtime_id: string;

  @Column('uuid')
  activity_type_id: string;

  @Column('text')
  description: string;

  @Column('text', { array: true, default: '{}' })
  photo_urls: string[];

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  gps_lat?: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  gps_lng?: number;

  @ManyToOne(() => Overtime, (overtime) => overtime.aktivitas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'overtime_id' })
  overtime: Overtime;

  @ManyToOne(() => ActivityType)
  @JoinColumn({ name: 'activity_type_id' })
  activity_type: ActivityType;

  @CreateDateColumn()
  created_at: Date;
}
