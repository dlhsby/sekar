import { IsString, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing rayon.
 *
 * All fields are optional. Only provided fields will be updated.
 */
export class UpdateRayonDto {
  /**
   * Updated code for the rayon.
   * Can only contain uppercase letters, numbers, and underscores.
   *
   * @example 'SELATAN_NEW'
   */
  @ApiPropertyOptional({
    description: 'Unique code for the rayon (uppercase alphanumeric with underscores)',
    example: 'SELATAN_NEW',
    maxLength: 20,
    pattern: '^[A-Z0-9_]+$',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Code must not exceed 20 characters' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code can only contain uppercase letters, numbers, and underscores',
  })
  code?: string;

  /**
   * Updated display name for the rayon.
   *
   * @example 'Rayon Selatan Baru'
   */
  @ApiPropertyOptional({
    description: 'Display name for the rayon',
    example: 'Rayon Selatan Baru',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  /**
   * Updated description of the rayon.
   *
   * @example 'Updated description for southern Surabaya districts'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the rayon',
    example: 'Updated description for southern Surabaya districts',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
