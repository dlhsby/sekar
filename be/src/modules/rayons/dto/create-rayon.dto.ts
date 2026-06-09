import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new rayon.
 *
 * Validates incoming request data for rayon creation endpoint.
 * Code and name are required. Description is optional.
 */
export class CreateRayonDto {
  /**
   * Unique code for the rayon.
   * Can only contain uppercase letters, numbers, and underscores.
   *
   * @example 'SELATAN'
   */
  @ApiProperty({
    description: 'Unique code for the rayon (uppercase alphanumeric with underscores)',
    example: 'SELATAN',
    minLength: 1,
    maxLength: 20,
    pattern: '^[A-Z0-9_]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(20, { message: 'Code must not exceed 20 characters' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code can only contain uppercase letters, numbers, and underscores',
  })
  code: string;

  /**
   * Display name for the rayon.
   *
   * @example 'Rayon Selatan'
   */
  @ApiProperty({
    description: 'Display name for the rayon',
    example: 'Rayon Selatan',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  /**
   * Optional description of the rayon.
   *
   * @example 'Covers southern Surabaya districts'
   */
  @ApiPropertyOptional({
    description: 'Detailed description of the rayon',
    example: 'Covers southern Surabaya districts',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
