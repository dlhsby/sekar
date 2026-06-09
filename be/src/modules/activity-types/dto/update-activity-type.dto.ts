import {
  IsString,
  MaxLength,
  IsOptional,
  Matches,
  IsArray,
  ArrayUnique,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid roles that can perform activities
 */
const VALID_ACTIVITY_ROLES = ['Worker', 'Linmas'];

/**
 * Data Transfer Object for updating an existing activity type.
 *
 * All fields are optional. Only provided fields will be updated.
 */
export class UpdateActivityTypeDto {
  /**
   * Updated code for the activity type.
   * Can only contain uppercase letters, numbers, and underscores.
   *
   * @example 'WATERING_NEW'
   */
  @ApiPropertyOptional({
    description: 'Unique code for the activity type (uppercase alphanumeric with underscores)',
    example: 'WATERING_NEW',
    maxLength: 50,
    pattern: '^[A-Z0-9_]+$',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Code must not exceed 50 characters' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code can only contain uppercase letters, numbers, and underscores',
  })
  code?: string;

  /**
   * Updated display name for the activity type.
   *
   * @example 'Penyiraman Baru'
   */
  @ApiPropertyOptional({
    description: 'Display name for the activity type',
    example: 'Penyiraman Baru',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  /**
   * Updated description of the activity type.
   *
   * @example 'Updated description for watering activity'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the activity type',
    example: 'Updated description for watering activity',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  /**
   * Updated roles that can perform this activity.
   * Valid values: 'Worker', 'Linmas'
   *
   * @example ['satgas', 'linmas']
   */
  @ApiPropertyOptional({
    description: 'Roles that can perform this activity',
    example: ['satgas', 'linmas'],
    type: [String],
    enum: VALID_ACTIVITY_ROLES,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @ArrayUnique({ message: 'Roles must be unique' })
  @IsIn(VALID_ACTIVITY_ROLES, {
    each: true,
    message: 'Each role must be one of: Worker, Linmas',
  })
  applicable_roles?: string[];

  /**
   * Whether the activity type is active.
   *
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Whether the activity type is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
