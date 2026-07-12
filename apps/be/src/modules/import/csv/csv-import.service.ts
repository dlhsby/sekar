import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { RedisService } from '../../../common/services/redis.service';
import { UsersService } from '../../users/users.service';
import { LocationsService } from '../../locations/locations.service';
import { Location } from '../../locations/entities/location.entity';
import { parseCsv } from './csv-parser';
import {
  validateUsers,
  validateAreas,
  ImportValidationError,
  ValidatedUserRow,
  ValidatedAreaRow,
} from './csv-validators';
import { CsvImportEntity, buildTemplate } from './csv-templates';
import { CsvValidationResponseDto, CsvCommitResponseDto } from '../dto/csv-import.dto';

interface CsvSession {
  userId: string;
  entityType: CsvImportEntity;
  validRows: ValidatedUserRow[] | ValidatedAreaRow[];
  createdAt: string;
}

/** Redis session TTL for a pending CSV import (1 hour, per backend.md §F). */
const SESSION_TTL_SECONDS = 3600;
const SESSION_PREFIX = 'import:';

/**
 * CSV bulk-import (Phase 4-5 §F). Validate-then-confirm: the validate endpoints
 * parse + check each row and stash the valid rows in a 1-hour Redis session;
 * `confirm` inserts them via the existing Users/Areas services.
 */
@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly locationsService: LocationsService,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
  ) {}

  /** Parse + validate a CSV upload, creating a session when any row is valid. */
  async validate(
    entity: CsvImportEntity,
    file: Express.Multer.File,
    userId: string,
  ): Promise<CsvValidationResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    const parsed = this.parse(file);
    const { valid, errors } =
      entity === 'users' ? validateUsers(parsed.rows) : validateAreas(parsed.rows);

    let sessionId: string | undefined;
    if (valid.length > 0) {
      sessionId = uuidv4();
      const session: CsvSession = {
        userId,
        entityType: entity,
        validRows: valid,
        createdAt: new Date().toISOString(),
      };
      await this.redisService
        .getClient()
        .setex(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL_SECONDS, JSON.stringify(session));
    }

    return { validCount: valid.length, errors: errors as ImportValidationError[], sessionId };
  }

  private parse(file: Express.Multer.File) {
    try {
      return parseCsv(file.buffer.toString('utf-8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid CSV';
      throw new BadRequestException(message);
    }
  }

  /** Insert the validated rows held in a session, then drop the session. */
  async confirm(sessionId: string, userId: string): Promise<CsvCommitResponseDto> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const raw = await this.redisService.getClient().get(key);
    if (!raw) {
      throw new NotFoundException('Import session not found or expired');
    }

    const session = JSON.parse(raw) as CsvSession;
    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this import session');
    }

    // Consume the session exactly once: delete it whether the commit succeeds or
    // throws, so a partially-applied batch can never be re-run (no duplicates).
    // A fresh upload is required to retry.
    try {
      return session.entityType === 'users'
        ? await this.commitUsers(session.validRows as ValidatedUserRow[])
        : await this.commitAreas(session.validRows as ValidatedAreaRow[]);
    } finally {
      await this.redisService.getClient().del(key);
    }
  }

  private async commitUsers(rows: ValidatedUserRow[]): Promise<CsvCommitResponseDto> {
    let imported = 0;
    const skippedReasons: string[] = [];
    const credentials: CsvCommitResponseDto['credentials'] = [];
    for (const row of rows) {
      try {
        const created = await this.usersService.create({
          username: row.username,
          password: row.password,
          full_name: row.full_name,
          role: row.role,
          phone_number: row.phone_number,
          location_ids: row.location_id ? [row.location_id] : undefined,
          rayon_id: row.rayon_id,
        });
        // A password omitted from the CSV is auto-generated and returned once —
        // collect it so the admin can hand the temp password to the worker.
        if (created.temp_password) {
          credentials.push({
            username: created.username,
            phone_number: created.phone_number ?? null,
            temp_password: created.temp_password,
          });
        }
        imported++;
      } catch (error) {
        skippedReasons.push(this.skipReason(row.username, error));
      }
    }
    return {
      imported,
      skipped: skippedReasons.length,
      skippedReasons,
      credentials: credentials.length ? credentials : undefined,
    };
  }

  private async commitAreas(rows: ValidatedAreaRow[]): Promise<CsvCommitResponseDto> {
    let imported = 0;
    const skippedReasons: string[] = [];
    for (const row of rows) {
      try {
        const area = await this.locationsService.create({
          name: row.name,
          location_type_id: row.location_type_id,
          address: row.address,
          gps_lat: row.latitude,
          gps_lng: row.longitude,
          radius_meters: row.radius_meters,
        });
        // CreateLocationDto carries no rayon_id — assign it directly post-create.
        await this.areaRepository.update(area.id, { rayon_id: row.rayon_id });
        imported++;
      } catch (error) {
        skippedReasons.push(this.skipReason(row.name, error));
      }
    }
    return { imported, skipped: skippedReasons.length, skippedReasons };
  }

  private skipReason(label: string, error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.warn(`Skipped "${label}": ${message}`);
    return `${label}: ${message}`;
  }

  /** Empty CSV template (header row only) for the entity. */
  getTemplate(entity: CsvImportEntity): { filename: string; content: string } {
    return { filename: `${entity}-template.csv`, content: buildTemplate(entity) };
  }
}
