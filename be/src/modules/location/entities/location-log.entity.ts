import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

/**
 * LocationLog Entity
 *
 * Represents GPS location pings sent by workers during their shifts.
 * Used for real-time tracking and location history.
 */
@Entity('location_logs')
export class LocationLog {
  @ApiProperty({ description: 'Location log UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Worker UUID who sent the location ping' })
  @Column({ type: 'uuid' })
  worker_id: string;

  @ApiProperty({ description: 'Shift UUID when location was logged' })
  @Column({ type: 'uuid' })
  shift_id: string;

  @ApiProperty({ description: 'GPS latitude', example: -7.2905 })
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  gps_lat: number;

  @ApiProperty({ description: 'GPS longitude', example: 112.7398 })
  @Column({ type: 'decimal', precision: 11, scale: 8 })
  gps_lng: number;

  @ApiProperty({
    description: 'GPS accuracy in meters',
    example: 12.5,
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  accuracy_meters?: number;

  @ApiProperty({
    description: 'Device battery level (0-100)',
    example: 85,
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  battery_level?: number;

  @ApiProperty({ description: 'Timestamp when location was captured by device' })
  @Column({ type: 'timestamptz' })
  logged_at: Date;

  // Relations
  @ApiProperty({ type: () => User, description: 'Worker who sent the location' })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ApiProperty({ type: () => Shift, description: 'Shift when location was logged' })
  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
