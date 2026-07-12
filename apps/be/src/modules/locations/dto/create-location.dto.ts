import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsInt,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new area
 */
export class CreateLocationDto {
  @ApiProperty({
    description: 'Name of the area',
    example: 'Taman Bungkul',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Location type UUID (must reference existing area type)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @IsUUID()
  location_type_id: string;

  @ApiPropertyOptional({
    description: 'Rayon UUID this area belongs to',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsOptional()
  @IsUUID()
  rayon_id?: string;

  @ApiProperty({
    description: 'GPS latitude of area center (must be between -90 and 90)',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of area center (must be between -180 and 180)',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiPropertyOptional({
    description: 'Boundary radius in meters (defaults to 100m, max 10000m / 10km)',
    example: 100,
    default: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  radius_meters?: number;

  @ApiPropertyOptional({
    description: 'Physical address of the area',
    example: 'Jl. Taman Bungkul, Darmo, Surabaya',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
