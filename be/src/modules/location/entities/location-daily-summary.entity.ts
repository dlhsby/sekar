import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Per-user, per-day aggregate of location pings (Phase 4-6 B3).
 * Written by the daily-summary cron and backfilled by the retention cron
 * before old location_logs rows are purged (90-day policy, spec §I1).
 */
@Entity('location_daily_summaries')
@Unique('uq_location_summary_user_date', ['user_id', 'date'])
@Index('idx_location_summaries_date', ['date'])
export class LocationDailySummary {
  @ApiProperty({ description: 'Summary ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User the summary belongs to' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'WIB calendar date being summarized', example: '2026-06-10' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ description: 'Total location pings recorded that day' })
  @Column({ type: 'int', default: 0 })
  total_pings: number;

  @ApiPropertyOptional({ description: 'First ping timestamp' })
  @Column({ type: 'timestamptz', nullable: true })
  first_ping_at?: Date | null;

  @ApiPropertyOptional({ description: 'Last ping timestamp' })
  @Column({ type: 'timestamptz', nullable: true })
  last_ping_at?: Date | null;

  @ApiPropertyOptional({ description: 'Average latitude across pings' })
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  avg_latitude?: string | null;

  @ApiPropertyOptional({ description: 'Average longitude across pings' })
  @Column({ type: 'decimal', precision: 11, scale: 7, nullable: true })
  avg_longitude?: string | null;

  @ApiProperty({ description: 'Pings inside the assigned area boundary' })
  @Column({ type: 'int', default: 0 })
  within_area_pings: number;

  @ApiProperty({ description: 'Pings outside the assigned area boundary' })
  @Column({ type: 'int', default: 0 })
  outside_area_pings: number;

  @ApiPropertyOptional({ description: 'Area the user was assigned to that day' })
  @Column({ type: 'uuid', nullable: true })
  area_id?: string | null;

  @ApiPropertyOptional({ description: 'Rayon of the assigned area' })
  @Column({ type: 'uuid', nullable: true })
  rayon_id?: string | null;

  @ApiProperty({ description: 'True when written by the retention backfill, not the daily cron' })
  @Column({ type: 'boolean', default: false })
  is_backfilled: boolean;

  @ApiProperty({ description: 'Row creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
