import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { ActivityType } from '../../activity-types/entities/activity-type.entity';

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DECLINED = 'declined',
}

/**
 * Task priority enum
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Task entity for work assignments
 *
 * Tasks are created by KoordinatorLapangan or higher roles and assigned to Workers/Linmas.
 * Workers can accept, decline, start, and complete tasks with photo evidence.
 */
@Entity('tasks')
@Index(['area_id', 'status'])
@Index(['assigned_to', 'status'])
@Index(['created_by'])
@Index(['deadline'])
@Index(['status', 'priority'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  // Foreign keys
  @Column({ name: 'area_id', type: 'uuid' })
  area_id: string;

  @Column({ name: 'activity_type_id', type: 'uuid', nullable: true })
  activity_type_id: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assigned_to: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  created_by: string;

  // Completion fields
  @Column({ type: 'varchar', length: 500, nullable: true })
  completion_photo_url: string | null;

  @Column({ type: 'text', nullable: true })
  completion_notes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  // GPS coordinates for completion verification
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  completion_gps_lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  completion_gps_lng: number | null;

  // Decline reason
  @Column({ type: 'text', nullable: true })
  decline_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  declined_at: Date | null;

  // Assignment tracking
  @Column({ type: 'timestamptz', nullable: true })
  assigned_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  // Relations
  @ManyToOne(() => Area, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne(() => ActivityType, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_type_id' })
  activityType: ActivityType;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
