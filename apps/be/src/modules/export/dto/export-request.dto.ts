import {
  IsEnum,
  IsOptional,
  IsISO8601,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ExportEntityType, ExportFormat } from '../entities/export-job.entity';

export const EXPORT_ENTITY_TYPES: ExportEntityType[] = [
  'users',
  'areas',
  'rayons',
  'tasks',
  'activities',
  'overtime',
];

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'kmz'];

const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Rejects a `startDate`/`endDate` pair spanning more than 366 days, or an
 * inverted range. No-op when either bound is absent.
 */
@ValidatorConstraint({ name: 'dateRangeWithin366Days', async: false })
export class DateRangeWithin366Days implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as ExportRequestDto;
    if (!dto.startDate || !dto.endDate) {
      return true;
    }
    const start = Date.parse(dto.startDate);
    const end = Date.parse(dto.endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return true; // leave format errors to @IsISO8601
    }
    if (end < start) {
      return false;
    }
    return end - start <= MAX_RANGE_DAYS * MS_PER_DAY;
  }

  defaultMessage(): string {
    return 'Date range must be valid and span at most 366 days';
  }
}

export class ExportRequestDto {
  @ApiProperty({ enum: EXPORT_ENTITY_TYPES, description: 'Entity to export' })
  @IsEnum(EXPORT_ENTITY_TYPES, {
    message: `entityType must be one of: ${EXPORT_ENTITY_TYPES.join(', ')}`,
  })
  entityType: ExportEntityType;

  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: 'csv' })
  @IsOptional()
  @IsEnum(EXPORT_FORMATS, { message: `format must be one of: ${EXPORT_FORMATS.join(', ')}` })
  format?: ExportFormat;

  @ApiPropertyOptional({ description: 'Inclusive start date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  @Validate(DateRangeWithin366Days)
  startDate?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by area id' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter by rayon id' })
  @IsOptional()
  @IsUUID()
  rayonId?: string;
}
