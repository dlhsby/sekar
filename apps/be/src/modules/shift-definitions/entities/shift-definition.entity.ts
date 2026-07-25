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
 * Represents a configurable shift time definition (ADR-055). The day's shifts
 * are operator-managed at runtime — any number (a single all-day shift, two,
 * five, …), each with its own attribution window and reminder timing. Seed data
 * ships three defaults (06:00–15:00, 15:00–23:00, 21:00–05:00) but nothing in
 * the app assumes exactly three.
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

  /**
   * Attribution window (ADR-055). A clock-in is attributed to this shift from
   * `early_window_min` BEFORE its start until `cutoff_grace_min` AFTER its end;
   * past the cutoff the shift drops out of the picker and anything left open is
   * a dangling `lupa_clock_out`. Configurable per shift-definition (the night
   * shift wants a longer grace than the day shift). Default 60 min each.
   */
  @ApiProperty({
    description: 'Minutes BEFORE start that a clock-in still attributes to this shift',
    example: 60,
    default: 60,
  })
  @Column({ name: 'early_window_min', type: 'int', default: 60 })
  early_window_min?: number;

  @ApiProperty({
    description: 'Minutes AFTER end that a clock-in/out still attributes; past it → dangling',
    example: 60,
    default: 60,
  })
  @Column({ name: 'cutoff_grace_min', type: 'int', default: 60 })
  cutoff_grace_min?: number;

  /**
   * Reminder timing (ADR-055). `start_reminder_min` = minutes BEFORE the shift
   * starts to push a "your shift starts soon" reminder (default 15, matching the
   * legacy fixed window); `end_reminder_min` = minutes before the shift ends to
   * push a clock-out reminder (null/0 = off). Both 0..1440.
   */
  @ApiProperty({
    description: 'Minutes before start to push a shift-start reminder (0 = off)',
    example: 15,
    default: 15,
  })
  @Column({ name: 'start_reminder_min', type: 'int', default: 15 })
  start_reminder_min?: number;

  @ApiProperty({
    description: 'Minutes before end to push a shift-end reminder (null/0 = off)',
    example: 10,
    nullable: true,
  })
  @Column({ name: 'end_reminder_min', type: 'int', nullable: true })
  end_reminder_min?: number | null;

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
