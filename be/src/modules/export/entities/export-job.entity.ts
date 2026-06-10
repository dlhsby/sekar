import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ExportEntityType =
  | 'users'
  | 'areas'
  | 'rayons'
  | 'tasks'
  | 'activities'
  | 'overtime'
  | 'schedules';

export type ExportFormat = 'csv' | 'xlsx' | 'kmz';

export type ExportJobStatus = 'processing' | 'completed' | 'failed';

/**
 * Tracks asynchronous export jobs (Phase 4-5, backend.md §E3).
 *
 * Created for exports exceeding the 5000-row sync threshold. `file_url` stores
 * the S3 **object key** (not a presigned URL) — fresh presigned URLs (15-min
 * TTL) are generated per `GET /export/jobs/:id` request. Only the creating user
 * may read a job.
 */
@Entity('export_jobs')
@Index('idx_export_jobs_user_status', ['user_id', 'status'])
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 30 })
  entity_type: ExportEntityType;

  @Column({ type: 'varchar', length: 10 })
  format: ExportFormat;

  @Column({ type: 'varchar', length: 20, default: 'processing' })
  status: ExportJobStatus;

  /** S3 object key, e.g. `exports/users/2026-06-10-<uuid>.xlsx`. */
  @Column({ type: 'text', nullable: true })
  file_url: string | null;

  @Column({ type: 'int', default: 0 })
  row_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  /** Filter snapshot used to build the export (date range, area, rayon) — for audit. */
  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown> | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
