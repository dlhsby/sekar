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
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { Location } from '../../locations/entities/location.entity';
import { Region } from '../../regions/entities/region.entity';
import { TeamCategory } from '../../teams/entities/team-category.entity';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';
import { ScheduleEventMember } from './schedule-event-member.entity';

/**
 * Recurrence config shape (stored as JSONB).
 * - `interval_n`: for every_n_days, the interval (min 2, max 30)
 * - `weekdays`: for weekly, array of 0=Sun..6=Sat (JS getDay convention)
 * - `dates`: for specific_dates, array of YYYY-MM-DD strings
 */
export interface RecurrenceConfig {
  interval_n?: number;
  weekdays?: number[];
  dates?: string[];
}

/**
 * ScheduleEvent — rule-based recurring schedule (ADR-047).
 * Materialized into concrete occurrences (schedules rows) by cron + on-demand.
 * Phase 4: team_category_id replaces team_id; concrete team (name, PIC, members)
 * are defined per schedule event, not in a standing teams table.
 */
@Entity('schedule_events')
@Index('IDX_schedule_events_shift_definition', ['shift_definition_id'])
@Index('IDX_schedule_events_user', ['user_id'])
@Index('IDX_schedule_events_team_category', ['team_category_id'])
@Index('IDX_schedule_events_start_date', ['start_date'])
export class ScheduleEvent {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Optional human-readable title', required: false })
  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @ApiProperty({ enum: RecurrenceType, description: 'Recurrence type' })
  @Column({ type: 'varchar', length: 20 })
  recurrence_type: RecurrenceType;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-07-15' })
  @Column({ type: 'date' })
  start_date: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD, nullable = open-ended)', required: false })
  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @ApiProperty({
    description: 'Recurrence configuration (interval_n, weekdays[], dates[])',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  recurrence_config: RecurrenceConfig | null;

  @ApiProperty({ description: 'Shift for all materialized occurrences' })
  @Column({ type: 'uuid' })
  shift_definition_id: string;

  @ApiProperty({ enum: ScheduleScope, description: 'Scope: static (location) or mobile (region)' })
  @Column({ type: 'varchar', length: 10 })
  scope: ScheduleScope;

  @ApiProperty({
    description: 'Location (required for static scope, null for mobile)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ApiProperty({
    description: 'Region (required for mobile scope, null for static)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;

  @ApiProperty({ description: 'Is team event (true) or individual (false)', default: false })
  @Column({ type: 'boolean', default: false })
  is_team: boolean;

  @ApiProperty({
    description: 'Team type (crew category; required for team events, null for individual)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  team_category_id: string | null;

  @ApiProperty({
    description: 'PIC/owner for team events (required for team, null for individual)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  pic_user_id: string | null;

  @ApiProperty({
    description: 'Individual user (required for individual events, null for team)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ApiProperty({ description: 'Whether the event is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Notes / reason', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
  @ManyToOne(() => ShiftDefinition, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_definition_id' })
  shift_definition: ShiftDefinition;

  @ManyToOne(() => Location, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location?: Location | null;

  @ManyToOne(() => Region, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region?: Region | null;

  @ManyToOne(() => TeamCategory, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'team_category_id' })
  team_category?: TeamCategory | null;

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pic_user_id' })
  pic_user?: User | null;

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @OneToMany(() => ScheduleEventMember, (m) => m.schedule_event, { cascade: true })
  members: ScheduleEventMember[];
}
