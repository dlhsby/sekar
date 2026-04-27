import { IsUUID, IsString, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a notable plant (heritage tree or significant specimen)
 *
 * Notably trees are specific, tracked locations with optional photos and pruning history.
 */
export class CreateNotablePlantDto {
  @ApiProperty({
    description: 'Area UUID',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsUUID()
  area_id: string;

  @ApiProperty({
    description: 'Plant species UUID',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @IsUUID()
  species_id: string;

  @ApiProperty({
    description: 'User-friendly label for the tree (e.g., heritage marker)',
    example: 'Heritage Trembesi - Est. 1950',
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of last pruning',
    example: '2026-03-15T10:30:00+07:00',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  last_pruned_at?: string;

  @ApiProperty({
    description: 'Free-form notes (condition, restrictions, etc.)',
    example: 'Trees roots near power lines, approach from east side only',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
