import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';

/**
 * Shift Entity
 *
 * Represents a work shift for a worker. Tracks clock-in and clock-out times,
 * GPS coordinates for location verification, and selfie photos for attendance proof.
 */
@Entity('shifts')
export class Shift {
  @ApiProperty({
    description: 'Unique identifier for the shift',
    example: 'd3e4f5a6-b7c8-9012-def0-123456789012',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Worker UUID (foreign key to users table)',
    example: 'f634880a-7498-449a-a293-9c5204176300',
  })
  @Column('uuid')
  worker_id: string;

  @ApiProperty({
    description: 'Worker details',
    type: () => User,
  })
  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ApiProperty({
    description: 'Area UUID (foreign key to areas table)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @Column('uuid')
  area_id: string;

  @ApiProperty({
    description: 'Area details',
    type: () => Area,
  })
  @ManyToOne(() => Area, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ApiProperty({
    description: 'Clock-in timestamp',
    example: '2026-01-09T08:00:00.000Z',
  })
  @Column({ type: 'timestamp with time zone' })
  clock_in_time: Date;

  @ApiProperty({
    description: 'GPS latitude at clock-in',
    example: -7.2905,
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  clock_in_gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude at clock-in',
    example: 112.7398,
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  clock_in_gps_lng: number;

  @ApiProperty({
    description: 'S3 URL of selfie photo taken at clock-in',
    example:
      'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/abc123.jpg',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  clock_in_photo_url: string;

  @ApiProperty({
    description: 'Clock-out timestamp (null if still active)',
    example: '2026-01-09T16:00:00.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  clock_out_time: Date;

  @ApiProperty({
    description: 'GPS latitude at clock-out',
    example: -7.2906,
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  clock_out_gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude at clock-out',
    example: 112.7399,
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  clock_out_gps_lng: number;

  @ApiProperty({
    description: 'S3 URL of selfie photo taken at clock-out',
    example:
      'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-out/abc123.jpg',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  clock_out_photo_url?: string;

  @ApiProperty({
    description: 'Timestamp when record was created',
    example: '2026-01-09T08:00:00.000Z',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when record was last updated',
    example: '2026-01-09T16:00:00.000Z',
  })
  @UpdateDateColumn()
  updated_at: Date;

  /**
   * Soft delete timestamp for data retention
   * CHECK constraints (clock_out_time > clock_in_time) are implemented in database migration
   */
  @DeleteDateColumn()
  deleted_at?: Date;
}
