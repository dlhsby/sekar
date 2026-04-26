import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Area } from '../../areas/entities/area.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ActivityType } from '../../activity-types/entities/activity-type.entity';

/**
 * Activity Approval Status Enum
 *
 * Phase 2C: Activity approval workflow
 * - PENDING: Awaiting review by Korlap or Kepala Rayon
 * - APPROVED: Activity has been accepted
 * - REJECTED: Activity has been declined with a reason
 */
export enum ActivityStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Activity Entity (formerly Report)
 *
 * Represents work activities submitted by field workers during their shifts.
 * Includes photos, GPS location, activity type, and task linkage.
 *
 * Phase 2C changes:
 * - Table: work_reports → activities
 * - Column: worker_id → user_id
 * - Dropped: report_type column (replaced by activity_type_id)
 * - Dropped: photo_url column (legacy - kept only photo_urls)
 * - Made activity_type_id NOT NULL
 */
@Entity('activities')
export class Activity {
  @ApiProperty({ description: 'Activity UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User UUID who created the activity' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Shift UUID when activity was created' })
  @Column({ type: 'uuid' })
  shift_id: string;

  @ApiProperty({ description: 'Area UUID where work was performed', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @ApiProperty({
    description: 'Task UUID (if activity is linked to a task)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  task_id?: string;

  @ApiProperty({
    description: 'Activity type UUID (required)',
  })
  @Column({ type: 'uuid' })
  activity_type_id: string;

  @ApiProperty({
    description: 'Activity description',
    example: 'Completed cleaning Taman Bungkul main area',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'S3 URLs of uploaded photos (1-3 photos)',
    example: [
      'https://sekar-bucket.s3.amazonaws.com/activities/photo1.jpg',
      'https://sekar-bucket.s3.amazonaws.com/activities/photo2.jpg',
    ],
    type: [String],
  })
  @Column('text', { array: true, default: '{}' })
  photo_urls: string[];

  @ApiProperty({
    description: 'GPS latitude where activity was created',
    example: -7.2905,
    nullable: true,
  })
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
  gps_lat: number | null;

  @ApiProperty({
    description: 'GPS longitude where activity was created',
    example: 112.7398,
    nullable: true,
  })
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
  gps_lng: number | null;

  @ApiProperty({
    description: 'Approval status of the activity',
    enum: ActivityStatus,
    default: ActivityStatus.PENDING,
    example: ActivityStatus.PENDING,
  })
  @Column({ type: 'varchar', length: 20, default: ActivityStatus.PENDING })
  status: ActivityStatus;

  @ApiProperty({ description: 'UUID of the user who reviewed this activity', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @ApiProperty({ description: 'Timestamp when the activity was reviewed', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @ApiProperty({ description: 'Reason for rejection (if rejected)', nullable: true })
  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true, name: 'case_type' })
  caseType: string | null;

  @Column({ type: 'jsonb', default: {}, name: 'custom_fields' })
  customFields: Record<string, unknown>;

  @Column({ type: 'text', nullable: true, name: 'photo_before_url' })
  photoBeforeUrl: string | null;

  @Column({ type: 'text', nullable: true, name: 'photo_after_url' })
  photoAfterUrl: string | null;

  @Column({ type: 'text', nullable: true, unique: true, name: 'reference_code' })
  referenceCode: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'pruning_request_id' })
  pruningRequestId: string | null;

  @ApiProperty({ description: 'Activity creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Activity last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  /**
   * Soft delete timestamp for data retention
   * CHECK constraints for GPS ranges are implemented in database migration
   */
  @DeleteDateColumn()
  deleted_at?: Date;

  // Relations
  @ApiProperty({ type: () => User, description: 'User who created the activity' })
  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Shift, description: 'Shift when activity was created' })
  @ManyToOne(() => Shift, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ type: () => Area, description: 'Area where work was performed', nullable: true })
  @ManyToOne(() => Area, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'area_id' })
  area?: Area;

  @ApiProperty({
    type: () => Task,
    description: 'Task this activity is linked to (if any)',
    required: false,
  })
  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @ApiProperty({
    type: () => ActivityType,
    description: 'Activity type of the work performed',
  })
  @ManyToOne(() => ActivityType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'activity_type_id' })
  activityType: ActivityType;

  @ApiProperty({
    type: () => User,
    description: 'User who reviewed (approved/rejected) this activity',
    nullable: true,
  })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
