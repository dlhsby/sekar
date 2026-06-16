import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ description: 'Asset category id' })
  @IsUUID()
  category_id: string;

  @ApiPropertyOptional({ description: 'Area id (area-level assets)' })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  @ApiPropertyOptional({ description: 'Rayon id (rayon-level assets, e.g. vehicles)' })
  @IsOptional()
  @IsUUID()
  rayon_id?: string;

  @ApiProperty({ example: 'Sapu Lidi #1' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_price?: number;
}
