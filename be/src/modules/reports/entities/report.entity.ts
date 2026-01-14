import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

export enum ReportType {
  TASK_COMPLETION = 'task_completion',
  INCIDENT = 'incident',
  MAINTENANCE_REQUEST = 'maintenance_request',
}

/**
 * Report Entity
 *
 * Represents work reports submitted by workers during their shifts.
 * Includes photos, GPS location, and report type.
 */
@Entity('reports')
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

  @ApiProperty({
    description: 'Report type',
    enum: ReportType,
    example: ReportType.TASK_COMPLETION,
  })
  @Column({
    type: 'varchar',
    length: 50,
  })
  report_type: ReportType;

  @ApiProperty({ description: 'Report description', example: 'Completed cleaning Taman Bungkul main area' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'S3 URL of uploaded photo',
    example: 'https://sekar-bucket.s3.amazonaws.com/reports/photo.jpg',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
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

  // Relations
  @ApiProperty({ type: () => User, description: 'Worker who created the report' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ApiProperty({ type: () => Shift, description: 'Shift when report was created' })
  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
