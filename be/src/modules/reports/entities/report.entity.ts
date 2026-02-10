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

export enum ReportType {
  // Mobile-compatible values
  CLEANING = 'cleaning',
  PLANTING = 'planting',
  MAINTENANCE = 'maintenance',
  INSPECTION = 'inspection',
  // Legacy values for backward compatibility
  TASK_COMPLETION = 'task_completion',
  INCIDENT = 'incident',
  MAINTENANCE_REQUEST = 'maintenance_request',
}

/**
 * Work Report Entity
 *
 * Represents work reports submitted by workers during their shifts.
 * Includes photos, GPS location, report type, and supervisor review status.
 */
@Entity('work_reports')
export class Report {
  @ApiProperty({ description: 'Report UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Worker UUID who created the report' })
  @Column({ type: 'uuid' })
  worker_id: string;

  @ApiProperty({ description: 'Shift UUID when report was created' })
  @Column({ type: 'uuid' })
  shift_id: string;

  @ApiProperty({ description: 'Area UUID where work was performed', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  // Phase 2 additions
  @ApiProperty({
    description: 'Task UUID (if report is linked to a task)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  task_id?: string;

  @ApiProperty({
    description: 'Activity type UUID (required for new aktivitas)',
  })
  @Column({ type: 'uuid', nullable: true })
  activity_type_id?: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReportType,
    example: ReportType.TASK_COMPLETION,
    required: false,
  })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  report_type?: ReportType;

  @ApiProperty({
    description: 'Report description',
    example: 'Completed cleaning Taman Bungkul main area',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'S3 URLs of uploaded photos (1-3 photos)',
    example: ['https://sekar-bucket.s3.amazonaws.com/reports/photo1.jpg', 'https://sekar-bucket.s3.amazonaws.com/reports/photo2.jpg'],
    type: [String],
  })
  @Column('text', { array: true, default: '{}' })
  photo_urls: string[];

  @ApiProperty({
    description: 'S3 URL of uploaded photo (backward compatibility)',
    example: 'https://sekar-bucket.s3.amazonaws.com/reports/photo.jpg',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  photo_url?: string;

  @ApiProperty({ description: 'GPS latitude where report was created', example: -7.2905 })
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  gps_lat: number;

  @ApiProperty({ description: 'GPS longitude where report was created', example: 112.7398 })
  @Column({ type: 'decimal', precision: 11, scale: 8 })
  gps_lng: number;

  @ApiProperty({ description: 'Report creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Report last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  /**
   * Soft delete timestamp for data retention
   * CHECK constraints for GPS ranges and condition enum are implemented in database migration
   */
  @DeleteDateColumn()
  deleted_at?: Date;

  // Relations
  @ApiProperty({ type: () => User, description: 'Worker who created the report' })
  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ApiProperty({ type: () => Shift, description: 'Shift when report was created' })
  @ManyToOne(() => Shift, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ type: () => Area, description: 'Area where work was performed', nullable: true })
  @ManyToOne(() => Area, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'area_id' })
  area?: Area;

  // Phase 2 relations
  @ApiProperty({
    type: () => Task,
    description: 'Task this report is linked to (if any)',
    required: false,
  })
  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @ApiProperty({
    type: () => ActivityType,
    description: 'Activity type of the work performed',
    required: false,
  })
  @ManyToOne(() => ActivityType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_type_id' })
  activityType?: ActivityType;
}
