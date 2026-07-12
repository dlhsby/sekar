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
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { Region } from '../../regions/entities/region.entity';
import { TeamType } from '../../teams/entities/team-type.entity';
import { ScheduleEvent } from './schedule-event.entity';
import { ScheduleLocation } from './schedule-area.entity';

/**
 * Per-worker, per-WIB-day roster status.
 * - `planned`  — expected to work (has a shift); not yet clocked in
 * - `present`  — clocked in today (set lazily / on read; informational)
 * - `absent`   — expected but did not clock in (derived on read in monitoring)
 * - `leave_sick` / `leave_annual` — excused absence set by an admin
 * - `replaced` — the worker was swapped out; see `replacement_user_id`
 * - `off`      — no shift scheduled (management / no-shift worker; still clockable)
 */
export enum ScheduleStatus {
  PLANNED = 'planned',
  PRESENT = 'present',
  ABSENT = 'absent',
  LEAVE_SICK = 'leave_sick',
  LEAVE_ANNUAL = 'leave_annual',
  LEAVE_PERMIT = 'leave_permit',
  REPLACED = 'replaced',
  OFF = 'off',
}

export type ScheduleSource = 'template' | 'manual' | 'event';

/**
 * Schedule — one materialized roster row per worker per WIB day,
 * generated from the worker's standing template (rayon + permanent areas + one
 * shift) and editable per-day by admins. See ADR-013.
 */
@Entity('schedules')
@Index('IDX_schedules_date', ['schedule_date'])
@Index('IDX_schedules_rayon_date', ['rayon_id', 'schedule_date'])
// Roster uniqueness is now time-based, not per (user, day): a user can have
// multiple non-overlapping shifts. The overlap guard enforces real conflicts.
@Index('UQ_schedules_user_date_shift', ['user_id', 'schedule_date', 'shift_definition_id'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Schedule {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Worker this roster row is for' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'WIB calendar day (YYYY-MM-DD)', example: '2026-06-30' })
  @Column({ type: 'date' })
  schedule_date: string;

  @ApiProperty({ description: 'Single rayon for the day (null = none)', required: false })
  @Column({ type: 'uuid', nullable: true })
  rayon_id: string | null;

  @ApiProperty({ description: 'Single shift for the day (null = no shift / off)', required: false })
  @Column({ type: 'uuid', nullable: true })
  shift_definition_id: string | null;

  @ApiProperty({ enum: ScheduleStatus, default: ScheduleStatus.PLANNED })
  @Column({ type: 'varchar', length: 20, default: ScheduleStatus.PLANNED })
  status: ScheduleStatus;

  @ApiProperty({ description: 'If replaced, the covering worker', required: false })
  @Column({ type: 'uuid', nullable: true })
  replacement_user_id: string | null;

  @ApiProperty({ description: 'If this row is a replacement, who it covers for', required: false })
  @Column({ type: 'uuid', nullable: true })
  original_user_id: string | null;

  @ApiProperty({ description: 'How the row was created', default: 'template' })
  @Column({ type: 'varchar', length: 20, default: 'template' })
  source: ScheduleSource;

  @ApiProperty({ description: 'Marked as overtime/lembur for the day', default: false })
  @Column({ type: 'boolean', default: false })
  is_overtime: boolean;

  @ApiProperty({ description: 'Reason / free note (e.g. leave reason)', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'If materialized from a ScheduleEvent, the event id',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  schedule_event_id: string | null;

  @ApiProperty({
    description: 'Region (for mobile-scope events)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;

  @ApiProperty({
    description: 'Team type (crew category; for team events)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  team_type_id: string | null;

  @ApiProperty({
    description: 'Is this occurrence detached (overridden from the event)',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  is_detached: boolean;

  /**
   * Virtual flag (not persisted): marks a row as a projection beyond the
   * materialization horizon (Phase 4, ADR-047). Omitted/false for materialized rows.
   */
  is_projected?: boolean;

  // Actor audit (set explicitly by the service; no FK — historical reference).
  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at?: Date;

  // Relations
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Rayon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rayon_id' })
  rayon?: Rayon | null;

  @ManyToOne(() => ShiftDefinition, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shift_definition_id' })
  shift_definition?: ShiftDefinition | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replacement_user_id' })
  replacement_user?: User | null;

  @ManyToOne(() => ScheduleEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_event_id' })
  schedule_event?: ScheduleEvent | null;

  @ManyToOne(() => Region, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region?: Region | null;

  @ManyToOne(() => TeamType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'team_type_id' })
  team_type?: TeamType | null;

  @OneToMany(() => ScheduleLocation, (dsa) => dsa.schedule, { cascade: true })
  schedule_areas: ScheduleLocation[];
}

export { ScheduleLocation };
