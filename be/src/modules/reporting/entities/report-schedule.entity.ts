import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ReportSchedule Entity
 *
 * Stores scheduled report generation configurations.
 * Cron jobs will run based on frequency and next_run_at.
 */
@Entity('report_schedules')
@Index(['is_active', 'next_run_at'])
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  template_id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  frequency: 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'varchar', nullable: false })
  cron_expression: string;

  @Column({ type: 'varchar', default: 'Asia/Jakarta' })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_run_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  next_run_at: Date | null;

  @Column({ type: 'uuid', nullable: false })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
