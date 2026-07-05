import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ShiftDefinition Entity
 *
 * Represents fixed shift time definitions.
 *
 * Phase 2: 3 Fixed Shifts
 * - Shift 1: 06:00 - 15:00 (morning)
 * - Shift 2: 15:00 - 23:00 (afternoon)
 * - Shift 3: 21:00 - 05:00 (night, crosses midnight)
 */
@Entity('shift_definitions')
export class ShiftDefinition {
  @ApiProperty({
    description: 'Unique identifier for the shift definition',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Display name for the shift',
    example: 'Shift 1',
  })
  @Column({ length: 50, unique: true })
  name: string;

  @ApiProperty({
    description: 'Unique code for the shift',
    example: 'SHIFT1',
  })
  @Column({ length: 10, unique: true })
  code: string;

  @ApiProperty({
    description: 'Start time of the shift',
    example: '06:00:00',
  })
  @Column({ type: 'time' })
  start_time: string;

  @ApiProperty({
    description: 'End time of the shift',
    example: '15:00:00',
  })
  @Column({ type: 'time' })
  end_time: string;

  @ApiProperty({
    description: 'Whether the shift crosses midnight (e.g., 21:00-05:00)',
    example: false,
    default: false,
  })
  @Column({ default: false })
  crosses_midnight: boolean;

  @ApiProperty({
    description: 'Whether the shift definition is active',
    example: true,
    default: true,
  })
  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    description: 'Timestamp when the shift definition was created',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the shift definition was last updated',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;

  // Actor audit — stamped by AuditSubscriber from the request's acting user.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by?: string;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deleted_by?: string;
}
