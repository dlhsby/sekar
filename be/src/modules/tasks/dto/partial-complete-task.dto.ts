import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PlantItemDto {
  @ApiProperty({ description: 'Plant species UUID' })
  @IsString()
  species_id: string;

  @ApiProperty({ description: 'Count of plants processed' })
  @IsInt()
  @IsPositive()
  count: number;
}

export class PartialCompleteTaskDto {
  @ApiProperty({ description: 'Number of plants/units completed in this session' })
  @IsInt()
  @IsPositive()
  completed_count: number;

  @ApiPropertyOptional({ type: [PlantItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantItemDto)
  plant_items?: PlantItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'If true, spawn a child task for the remaining work' })
  @IsOptional()
  @IsBoolean()
  resume_tomorrow?: boolean;
}
