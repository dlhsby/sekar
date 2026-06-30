import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new rayon.
 *
 * Validates incoming request data for rayon creation endpoint.
 * Name is required. Description/color/center coords are optional.
 */
export class CreateRayonDto {
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

  @ApiPropertyOptional({
    description: 'Hex color for the rayon boundary on the monitoring map',
    example: '#7FBC8C',
  })
  @IsString()
  @IsOptional()
  @MaxLength(9)
  color?: string;

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
}
