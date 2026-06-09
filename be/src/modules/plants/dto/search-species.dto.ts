import { IsString, IsOptional, Min, Max, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for searching plant species by name
 *
 * Performs case-insensitive ILIKE search on both Indonesian and scientific names.
 */
export class SearchSpeciesDto {
  @ApiProperty({
    description: 'Search query (matches name_id and name_latin)',
    example: 'trembesi',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiProperty({
    description: 'Maximum number of results (1-50, default 20)',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
