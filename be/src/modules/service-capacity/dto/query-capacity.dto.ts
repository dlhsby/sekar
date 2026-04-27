import { IsInt, IsOptional, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryCapacityDto {
  @IsInt()
  @Min(2000)
  @Max(2999)
  @Type(() => Number)
  @ApiProperty({ description: 'Year', example: 2026 })
  year: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(53)
  @Type(() => Number)
  @ApiProperty({ description: 'Start ISO week (optional)', example: 1 })
  fromWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(53)
  @Type(() => Number)
  @ApiProperty({ description: 'End ISO week (optional)', example: 53 })
  toWeek?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Service type filter (optional)',
    example: 'pruning',
  })
  serviceType?: string;
}
