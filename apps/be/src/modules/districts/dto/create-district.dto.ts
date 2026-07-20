import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MapStyleDto } from '../../../common/dto/map-style.dto';
import { StaffingLevel } from '../entities/district.entity';

/**
 * Data Transfer Object for creating a new district.
 *
 * Validates incoming request data for district creation endpoint.
 * Name is required. Description/center coords + per-level styling
 * (ADR-045, inherited from MapStyleDto) are optional.
 */
export class CreateDistrictDto extends MapStyleDto {
  /**
   * Display name for the district.
   *
   * @example 'Rayon Selatan'
   */
  @ApiProperty({
    description: 'Display name for the district',
    example: 'Rayon Selatan',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  /**
   * Optional description of the district.
   *
   * @example 'Covers southern Surabaya districts'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the district',
    example: 'Covers southern Surabaya districts',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Center latitude', example: -7.2575 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  center_lat?: number;

  @ApiPropertyOptional({ description: 'Center longitude', example: 112.7521 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  center_lng?: number;

  @ApiPropertyOptional({
    description: 'Tier its staffing requirements attach to (defaults to region=kawasan)',
    enum: StaffingLevel,
    default: StaffingLevel.REGION,
  })
  @IsOptional()
  @IsEnum(StaffingLevel)
  staffing_level?: StaffingLevel;
}
