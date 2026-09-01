import { IsString, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing area type.
 *
 * All fields are optional. Only provided fields will be updated.
 */
export class UpdateLocationTypeDto {
  /**
   * Updated code for the area type.
   * Can only contain lowercase letters, numbers, and underscores.
   *
   * @example 'public_park'
   */
  @ApiPropertyOptional({
    description: 'Unique code for the area type (lowercase alphanumeric with underscores)',
    example: 'public_park',
    maxLength: 20,
    pattern: '^[a-z0-9_]+$',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Code must not exceed 20 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Code can only contain lowercase letters, numbers, and underscores',
  })
  code?: string;

  /**
   * Updated display name for the area type.
   *
   * @example 'Public Park'
   */
  @ApiPropertyOptional({
    description: 'Display name for the area type',
    example: 'Public Park',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name?: string;

  /**
   * Updated description of the area type.
   *
   * @example 'Public park, garden, or green space'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the area type',
    example: 'Public park, garden, or green space',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
