import { IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BookCapacityDto {
  @IsInt()
  @Min(2000)
  @Max(2999)
  @Type(() => Number)
  @ApiProperty({ description: 'Year', example: 2026 })
  year: number;

  @IsInt()
  @Min(1)
  @Max(53)
  @Type(() => Number)
  @ApiProperty({ description: 'ISO week (1–53)', example: 20 })
  isoWeek: number;

  @IsString()
  @ApiProperty({ description: 'Service type', example: 'pruning' })
  serviceType: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ description: 'Units to book', example: 5 })
  units: number;
}
