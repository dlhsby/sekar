import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListSeedsQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Search by seed name', required: false })
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ description: 'Page number', example: 1, required: false })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty({ description: 'Limit per page', example: 20, required: false })
  limit?: number = 20;
}
