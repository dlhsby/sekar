import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ExportEntityType,
  ExportFormat,
  ExportJobStatus,
  ExportJob,
} from '../entities/export-job.entity';

/**
 * Async-export job view returned by `POST /export` (202) and `GET /export/jobs/:id`.
 * `downloadUrl` is a freshly-minted 15-min presigned URL, present only when the
 * job is completed.
 */
export class ExportJobResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty({ enum: ['processing', 'completed', 'failed'] })
  status: ExportJobStatus;

  @ApiProperty()
  entityType: ExportEntityType;

  @ApiProperty()
  format: ExportFormat;

  @ApiProperty()
  rowCount: number;

  @ApiPropertyOptional({ description: 'Presigned download URL (completed jobs only)' })
  downloadUrl?: string;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(job: ExportJob, downloadUrl?: string): ExportJobResponseDto {
    return {
      jobId: job.id,
      status: job.status,
      entityType: job.entity_type,
      format: job.format,
      rowCount: job.row_count,
      downloadUrl,
      errorMessage: job.error_message,
      createdAt: job.created_at,
    };
  }
}
