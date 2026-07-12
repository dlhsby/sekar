import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, SelectQueryBuilder, ObjectLiteral, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { S3Service } from '../../shared/services/s3.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Overtime } from '../overtime/entities/overtime.entity';
import { ExportJob, ExportEntityType, ExportFormat } from './entities/export-job.entity';
import { ExportRequestDto } from './dto/export-request.dto';
import type { Dataset, ExportFile } from './exporters/dataset';
import { toCsv } from './exporters/csv.exporter';
import { toXlsx } from './exporters/excel.exporter';
import { toKmz } from './exporters/kmz.exporter';
import {
  usersDataset,
  areasDataset,
  rayonsDataset,
  tasksDataset,
  activitiesDataset,
  overtimeDataset,
  areasPlacemarks,
} from './exporters/entity-datasets';

/** Rows at or below this count export synchronously; above, asynchronously. */
export const SYNC_ROW_LIMIT = 5000;
const MAX_RETRIES = 3;
const STUCK_AFTER_MS = 10 * 60 * 1000;

/** Entity types a kepala_rayon may export (scopable to their own rayon). */
const KEPALA_RAYON_ENTITIES: ExportEntityType[] = ['tasks', 'activities', 'overtime'];

interface EntityConfig {
  repo: () => Repository<ObjectLiteral>;
  alias: string;
  /** Column used for the startDate/endDate filter, or null if unsupported. */
  dateColumn: string | null;
  /** Column matched by the areaId filter, or null. */
  areaColumn: string | null;
  /** Column matched directly by the rayonId filter, or null. */
  rayonColumn: string | null;
  toDataset: (rows: ObjectLiteral[]) => Dataset;
}

/** Outcome of a sync vs async export decision. */
export type ExportResult =
  | { kind: 'file'; file: ExportFile; filename: string }
  | { kind: 'job'; job: ExportJob };

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly configs: Record<ExportEntityType, EntityConfig>;

  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepo: Repository<ExportJob>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
    @InjectRepository(Rayon) private readonly rayonRepo: Repository<Rayon>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Overtime) private readonly overtimeRepo: Repository<Overtime>,
    private readonly s3Service: S3Service,
  ) {
    const cast = (fn: (rows: never[]) => Dataset) => fn as (rows: ObjectLiteral[]) => Dataset;
    this.configs = {
      users: {
        repo: () => this.userRepo as Repository<ObjectLiteral>,
        alias: 'users',
        dateColumn: 'created_at',
        areaColumn: 'location_id',
        rayonColumn: 'rayon_id',
        toDataset: cast(usersDataset),
      },
      areas: {
        repo: () => this.locationRepo as Repository<ObjectLiteral>,
        alias: 'areas',
        dateColumn: 'created_at',
        areaColumn: 'id',
        rayonColumn: 'rayon_id',
        toDataset: cast(areasDataset),
      },
      rayons: {
        repo: () => this.rayonRepo as Repository<ObjectLiteral>,
        alias: 'rayons',
        dateColumn: 'created_at',
        areaColumn: null,
        rayonColumn: 'id',
        toDataset: cast(rayonsDataset),
      },
      tasks: {
        repo: () => this.taskRepo as Repository<ObjectLiteral>,
        alias: 'tasks',
        dateColumn: 'created_at',
        areaColumn: 'location_id',
        rayonColumn: 'rayon_id',
        toDataset: cast(tasksDataset),
      },
      activities: {
        repo: () => this.activityRepo as Repository<ObjectLiteral>,
        alias: 'activities',
        dateColumn: 'created_at',
        areaColumn: 'location_id',
        rayonColumn: null,
        toDataset: cast(activitiesDataset),
      },
      overtime: {
        repo: () => this.overtimeRepo as Repository<ObjectLiteral>,
        alias: 'overtimes',
        dateColumn: 'created_at',
        areaColumn: 'location_id',
        rayonColumn: null,
        toDataset: cast(overtimeDataset),
      },
    };
  }

  /**
   * Entry point for `POST /export`. Validates/scopes the request, then either
   * streams the file synchronously (≤5000 rows) or creates a background job.
   */
  async requestExport(dto: ExportRequestDto, user: User): Promise<ExportResult> {
    const format = this.resolveFormat(dto);
    const filters = this.scopeFilters(dto, user);

    const count = await this.countRows(dto.entityType, filters);
    if (count <= SYNC_ROW_LIMIT) {
      const file = await this.buildFile(dto.entityType, format, filters);
      return { kind: 'file', file, filename: this.filename(dto.entityType, file.extension) };
    }

    const job = await this.exportJobRepo.save(
      this.exportJobRepo.create({
        user_id: user.id,
        entity_type: dto.entityType,
        format,
        status: 'processing',
        row_count: count,
        filters: filters as unknown as Record<string, unknown>,
      }),
    );
    setImmediate(() => {
      void this.processJob(job.id);
    });
    return { kind: 'job', job };
  }

  /** Validate the format against the entity (kmz is areas-only). */
  private resolveFormat(dto: ExportRequestDto): ExportFormat {
    const format = dto.format ?? 'csv';
    if (format === 'kmz' && dto.entityType !== 'areas') {
      throw new BadRequestException('KMZ format is only available for areas');
    }
    return format;
  }

  /**
   * Apply role scoping: admins export anything; kepala_rayon is limited to
   * tasks/activities/overtime within their own rayon.
   */
  private scopeFilters(dto: ExportRequestDto, user: User): ExportRequestDto {
    if (user.role !== UserRole.KEPALA_RAYON) {
      return { ...dto };
    }
    if (!KEPALA_RAYON_ENTITIES.includes(dto.entityType)) {
      throw new ForbiddenException(
        `kepala_rayon may only export: ${KEPALA_RAYON_ENTITIES.join(', ')}`,
      );
    }
    if (!user.rayon_id) {
      throw new ForbiddenException('kepala_rayon account is missing a rayon assignment');
    }
    return { ...dto, rayonId: user.rayon_id };
  }

  private async countRows(
    entityType: ExportEntityType,
    filters: ExportRequestDto,
  ): Promise<number> {
    return this.buildQuery(entityType, filters).getCount();
  }

  private buildQuery(
    entityType: ExportEntityType,
    filters: ExportRequestDto,
  ): SelectQueryBuilder<ObjectLiteral> {
    const cfg = this.configs[entityType];
    const qb = cfg.repo().createQueryBuilder(cfg.alias);

    if (cfg.dateColumn && filters.startDate) {
      qb.andWhere(`${cfg.alias}.${cfg.dateColumn} >= :startDate`, { startDate: filters.startDate });
    }
    if (cfg.dateColumn && filters.endDate) {
      // Inclusive endDate: use next-day as exclusive upper bound for timestamptz columns
      const nextDay = new Date(filters.endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDateExclusive = nextDay.toISOString().split('T')[0];
      qb.andWhere(`${cfg.alias}.${cfg.dateColumn} < :endDate`, { endDate: endDateExclusive });
    }
    if (filters.areaId && cfg.areaColumn) {
      qb.andWhere(`${cfg.alias}.${cfg.areaColumn} = :areaId`, { areaId: filters.areaId });
    }
    if (filters.rayonId) {
      this.applyRayonFilter(qb, cfg, filters.rayonId);
    }
    return qb;
  }

  /** Scope by rayon directly when the entity carries rayon_id, else via its areas. */
  private applyRayonFilter(
    qb: SelectQueryBuilder<ObjectLiteral>,
    cfg: EntityConfig,
    rayonId: string,
  ): void {
    if (cfg.rayonColumn) {
      qb.andWhere(`${cfg.alias}.${cfg.rayonColumn} = :rayonId`, { rayonId });
    } else if (cfg.areaColumn) {
      qb.andWhere(
        `${cfg.alias}.${cfg.areaColumn} IN (SELECT id FROM locations WHERE rayon_id = :rayonId)`,
        { rayonId },
      );
    } else {
      throw new BadRequestException('This entity cannot be filtered by rayon');
    }
  }

  /** Load matching rows and serialize them into the requested format. */
  private async buildFile(
    entityType: ExportEntityType,
    format: ExportFormat,
    filters: ExportRequestDto,
  ): Promise<ExportFile> {
    const rows = await this.buildQuery(entityType, filters).getMany();

    if (format === 'kmz') {
      return toKmz(areasPlacemarks(rows as Location[]));
    }
    const dataset = this.configs[entityType].toDataset(rows);
    return format === 'xlsx' ? toXlsx(dataset, entityType) : toCsv(dataset);
  }

  private filename(entityType: ExportEntityType, ext: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${entityType}-${date}.${ext}`;
  }

  /**
   * Generate the export file for a job and upload it to S3. Marks the job
   * completed (with the S3 key) or failed (with the error message).
   */
  async processJob(jobId: string): Promise<void> {
    const job = await this.exportJobRepo.findOne({ where: { id: jobId } });
    // Only run jobs still in `processing` — never re-run a terminal job.
    if (!job || job.status !== 'processing') {
      return;
    }
    try {
      const file = await this.buildFile(
        job.entity_type,
        job.format,
        (job.filters as unknown as ExportRequestDto) ??
          ({ entityType: job.entity_type } as ExportRequestDto),
      );
      const date = new Date().toISOString().slice(0, 10);
      const key = `exports/${job.entity_type}/${date}-${uuidv4()}.${file.extension}`;
      await this.s3Service.uploadFile(file.buffer, key, file.contentType);

      job.status = 'completed';
      job.file_url = key;
      job.error_message = null;
      await this.exportJobRepo.save(job);
      this.logger.log(`Export job ${jobId} completed (${key})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      job.status = 'failed';
      job.error_message = message;
      await this.exportJobRepo.save(job);
      this.logger.error(`Export job ${jobId} failed: ${message}`);
    }
  }

  /** Fetch a job for its owner, attaching a fresh presigned URL when ready. */
  async getJobForUser(
    jobId: string,
    user: User,
  ): Promise<{ job: ExportJob; downloadUrl?: string }> {
    const job = await this.exportJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    if (job.user_id !== user.id) {
      throw new ForbiddenException('You do not have access to this export job');
    }
    let downloadUrl: string | undefined;
    if (job.status === 'completed' && job.file_url) {
      downloadUrl = await this.s3Service.getPresignedUrl(job.file_url, 900);
    }
    return { job, downloadUrl };
  }

  /** Recent export jobs for the user (last 30 days), newest first. */
  async listJobsForUser(user: User): Promise<ExportJob[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.exportJobRepo
      .createQueryBuilder('job')
      .where('job.user_id = :userId', { userId: user.id })
      .andWhere('job.created_at >= :since', { since })
      .orderBy('job.created_at', 'DESC')
      .getMany();
  }

  /**
   * Re-fire jobs stuck in `processing` for over 10 minutes. After 3 retries a
   * job is marked failed. Runs every 5 minutes (Asia/Jakarta).
   */
  @Cron('*/5 * * * *', { name: 'export-retry', timeZone: 'Asia/Jakarta' })
  async retryStuckJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MS);
    const stuck = await this.exportJobRepo.find({
      where: { status: 'processing', updated_at: LessThan(cutoff) },
    });

    for (const job of stuck) {
      if (job.retry_count >= MAX_RETRIES) {
        job.status = 'failed';
        job.error_message = 'Max retries exceeded';
        await this.exportJobRepo.save(job);
        continue;
      }
      job.retry_count += 1;
      await this.exportJobRepo.save(job);
      setImmediate(() => {
        void this.processJob(job.id);
      });
    }
  }
}
