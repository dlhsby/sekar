import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new area type.
 *
 * Validates incoming request data for area type creation endpoint.
 * Code and name are required. Description is optional.
 */
export class CreateAreaTypeDto {
  /**
   * Unique code for the area type.
   * Can only contain lowercase letters, numbers, and underscores.
   *
   * @example 'park'
   */
  @ApiProperty({
    description: 'Unique code for the area type (lowercase alphanumeric with underscores)',
    example: 'park',
    minLength: 1,
    maxLength: 20,
    pattern: '^[a-z0-9_]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(20, { message: 'Code must not exceed 20 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Code can only contain lowercase letters, numbers, and underscores',
  })
  code: string;

  /**
   * Display name for the area type.
   *
   * @example 'Park'
   */
  @ApiProperty({
    description: 'Display name for the area type',
    example: 'Park',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name: string;

  /**
   * Optional description of the area type.
   *
   * @example 'Public park or garden'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the area type',
    example: 'Public park or garden',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
