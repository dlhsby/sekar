import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsInt,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new area
 */
export class CreateAreaDto {
  @ApiProperty({
    description: 'Name of the area',
    example: 'Taman Bungkul',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Area type UUID (must reference existing area type)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @IsUUID()
  area_type_id: string;

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
    description:
      'Boundary radius in meters (defaults to 100m, max 10000m / 10km)',
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
  address?: string;
}
