import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { District } from '../../districts/entities/district.entity';
import { Region } from '../../regions/entities/region.entity';
import { TaskTag } from './task-tag.entity';
import { AssignmentScope } from '../../../common/enums/assignment-scope.enum';

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  REVISION_NEEDED = 'revision_needed',
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
@Index(['location_id', 'status'])
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

  /**
   * Geographic scope this task is bound to (ADR-046). Follows the assignee's
   * schedule occurrence by default (city/district/region/location), can be
   * overridden by the creator, or `none` for an ad-hoc task with no location
   * context (e.g. assigned to an unscheduled worker). Drives where the task —
   * and, once started, the worker running it — appears on the monitoring map.
   */
  @Column({
    type: 'enum',
    enum: AssignmentScope,
    default: AssignmentScope.NONE,
  })
  scope: AssignmentScope;

  // Foreign keys — the id for each level down to `scope` is populated.
  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  location_id: string | null;

  @Column({ name: 'region_id', type: 'uuid', nullable: true })
  region_id: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  district_id: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assigned_to: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  created_by: string;

  // Completion fields (Phase 2C: multiple photos, 1-3)
  @Column('text', { array: true, nullable: true, default: null })
  completion_photo_urls: string[] | null;

  @Column({ type: 'text', nullable: true })
  completion_notes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  // Assignment tracking
  @Column({ type: 'timestamptz', nullable: true })
  assigned_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  declined_at: Date | null;

  @Column({ type: 'text', nullable: true })
  decline_reason: string | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verified_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'text', nullable: true })
  revision_reason: string | null;

  // Phase 3: task typing + plant tracking + hierarchy
  @Column({ type: 'text', default: 'generic', name: 'task_type' })
  taskType?: string;

  @Column({ type: 'jsonb', default: {}, name: 'custom_fields' })
  customFields?: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true, name: 'parent_task_id' })
  parentTaskId?: string | null;

  @Column({ type: 'int', nullable: true, name: 'target_plant_count' })
  targetPlantCount?: number | null;

  @Column({ type: 'int', default: 0, name: 'completed_plant_count' })
  completedPlantCount?: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;

  // Relations
  @ManyToOne(() => Location, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'location_id' })
  area: Location | null;

  @ManyToOne(() => District, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'district_id' })
  district: District | null;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'region_id' })
  region: Region | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User | null;

  @OneToMany(() => TaskTag, (tag) => tag.task, { cascade: true })
  tags: TaskTag[];
}
