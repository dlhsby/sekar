import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, IsOptional, IsInt, Min, IsEnum } from 'class-validator';

export class CreatePlantSpeciesDto {
  @ApiProperty({
    description: 'Indonesian name of the plant species',
    example: 'Trembesi',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameId: string;

  @ApiPropertyOptional({
    description: 'Scientific (Latin) name of the plant species',
    example: 'Samanea saman',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameLatin?: string;

  @ApiPropertyOptional({
    description: 'Plant category (tree, shrub, groundcover, flower)',
    enum: ['tree', 'shrub', 'groundcover', 'flower'],
    default: 'tree',
  })
  @IsOptional()
  @IsEnum(['tree', 'shrub', 'groundcover', 'flower'])
  category?: 'tree' | 'shrub' | 'groundcover' | 'flower';

  @ApiPropertyOptional({
    description: 'Default pruning cycle in days',
    example: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultPruningCycleDays?: number;

  @ApiPropertyOptional({
    description: 'Additional notes or characteristics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
