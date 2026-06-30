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
import { DailyScheduleArea } from './daily-schedule-area.entity';

/**
 * Per-worker, per-WIB-day roster status.
 * - `planned`  — expected to work (has a shift); not yet clocked in
 * - `present`  — clocked in today (set lazily / on read; informational)
 * - `absent`   — expected but did not clock in (derived on read in monitoring)
 * - `leave_sick` / `leave_annual` — excused absence set by an admin
 * - `replaced` — the worker was swapped out; see `replacement_user_id`
 * - `off`      — no shift scheduled (management / no-shift worker; still clockable)
 */
export enum DailyScheduleStatus {
  PLANNED = 'planned',
  PRESENT = 'present',
  ABSENT = 'absent',
  LEAVE_SICK = 'leave_sick',
  LEAVE_ANNUAL = 'leave_annual',
  REPLACED = 'replaced',
  OFF = 'off',
}

export type DailyScheduleSource = 'template' | 'manual';

/**
 * DailySchedule — one materialized roster row per worker per WIB day,
 * generated from the worker's standing template (rayon + permanent areas + one
 * shift) and editable per-day by admins. See ADR-013.
 */
@Entity('daily_schedules')
@Index('IDX_daily_schedules_date', ['schedule_date'])
@Index('IDX_daily_schedules_rayon_date', ['rayon_id', 'schedule_date'])
// One live roster row per worker per day (soft-deleted rows excluded so a
// delete + regenerate is possible). Mirrors the migration's partial index.
@Index('UQ_daily_schedules_user_date', ['user_id', 'schedule_date'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class DailySchedule {
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

  @ApiProperty({ enum: DailyScheduleStatus, default: DailyScheduleStatus.PLANNED })
  @Column({ type: 'varchar', length: 20, default: DailyScheduleStatus.PLANNED })
  status: DailyScheduleStatus;

  @ApiProperty({ description: 'If replaced, the covering worker', required: false })
  @Column({ type: 'uuid', nullable: true })
  replacement_user_id: string | null;

  @ApiProperty({ description: 'If this row is a replacement, who it covers for', required: false })
  @Column({ type: 'uuid', nullable: true })
  original_user_id: string | null;

  @ApiProperty({ description: 'How the row was created', default: 'template' })
  @Column({ type: 'varchar', length: 20, default: 'template' })
  source: DailyScheduleSource;

  @ApiProperty({ description: 'Marked as overtime/lembur for the day', default: false })
  @Column({ type: 'boolean', default: false })
  is_overtime: boolean;

  @ApiProperty({ description: 'Reason / free note (e.g. leave reason)', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

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

  @OneToMany(() => DailyScheduleArea, (dsa) => dsa.daily_schedule, { cascade: true })
  daily_schedule_areas: DailyScheduleArea[];
}
