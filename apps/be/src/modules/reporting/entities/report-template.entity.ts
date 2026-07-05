import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ReportType } from '../enums/report.enums';

/**
 * ReportTemplate Entity
 *
 * Stores report template definitions. System-provided (is_system=true)
 * templates are read-only; admin-created templates can be modified.
 *
 * Includes 6 system templates (daily_operations, weekly_performance,
 * monthly_summary, worker_performance, area_status, overtime_utilization).
 */
@Entity('report_templates')
@Index(['slug'], { unique: true })
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', enum: ReportType, nullable: false })
  report_type: ReportType;

  @Column({ type: 'jsonb', nullable: true })
  template_config: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
