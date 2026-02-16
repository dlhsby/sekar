import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid roles that can perform activities
 */
const VALID_ACTIVITY_ROLES = ['Worker', 'Linmas'];

/**
 * Data Transfer Object for creating a new activity type.
 *
 * Validates incoming request data for activity type creation endpoint.
 */
export class CreateActivityTypeDto {
  /**
   * Unique code for the activity type.
   * Can only contain uppercase letters, numbers, and underscores.
   *
   * @example 'WATERING'
   */
  @ApiProperty({
    description: 'Unique code for the activity type (uppercase alphanumeric with underscores)',
    example: 'WATERING',
    minLength: 1,
    maxLength: 50,
    pattern: '^[A-Z0-9_]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(50, { message: 'Code must not exceed 50 characters' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code can only contain uppercase letters, numbers, and underscores',
  })
  code: string;

  /**
   * Display name for the activity type.
   *
   * @example 'Penyiraman'
   */
  @ApiProperty({
    description: 'Display name for the activity type',
    example: 'Penyiraman',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  /**
   * Optional description of the activity type.
   *
   * @example 'Watering plants and gardens'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the activity type',
    example: 'Watering plants and gardens',
  })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Roles that can perform this activity.
   * Valid values: 'Worker', 'Linmas'
   *
   * @example ['satgas']
   */
  @ApiProperty({
    description: 'Roles that can perform this activity',
    example: ['satgas'],
    type: [String],
    enum: VALID_ACTIVITY_ROLES,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one applicable role is required' })
  @ArrayUnique({ message: 'Roles must be unique' })
  @IsIn(VALID_ACTIVITY_ROLES, {
    each: true,
    message: 'Each role must be one of: Worker, Linmas',
  })
  applicable_roles: string[];
}
