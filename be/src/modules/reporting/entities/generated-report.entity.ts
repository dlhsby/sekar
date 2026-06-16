import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ForeignKey,
} from 'typeorm';
import { ReportType, ReportFormat, GeneratedReportStatus } from '../enums/report.enums';

/**
 * GeneratedReport Entity
 *
 * Represents a single generated report instance.
 * Tracks the file URL (S3 key), status, and parameters used for generation.
 */
@Entity('generated_reports')
@Index(['generated_by', 'created_at'])
@Index(['template_id', 'created_at'])
export class GeneratedReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  template_id: string;

  @Column({ type: 'uuid', nullable: true })
  generated_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  schedule_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'varchar', enum: ReportType, nullable: false })
  report_type: ReportType;

  @Column({ type: 'varchar', enum: ReportFormat, nullable: false })
  format: ReportFormat;

  @Column({
    type: 'varchar',
    enum: GeneratedReportStatus,
    default: GeneratedReportStatus.PROCESSING,
  })
  status: GeneratedReportStatus;

  @Column({ type: 'text', nullable: true })
  file_url: string | null;

  @Column({ type: 'bigint', nullable: true })
  file_size_bytes: number | null;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
