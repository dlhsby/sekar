import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { ActivityType } from '../../activity-types/entities/activity-type.entity';

export enum OvertimeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('overtimes')
export class Overtime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid', { nullable: true })
  area_id?: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  start_datetime: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  end_datetime: Date;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OvertimeStatus,
    default: OvertimeStatus.PENDING,
  })
  status: OvertimeStatus;

  @Column('uuid', { nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at?: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason?: string;

  @Column('uuid')
  activity_type_id: string;

  @Column('text')
  description: string;

  @Column('text', { array: true, default: '{}' })
  photo_urls: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  gps_lat?: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  gps_lng?: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area?: Area;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @ManyToOne(() => ActivityType)
  @JoinColumn({ name: 'activity_type_id' })
  activityType: ActivityType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
