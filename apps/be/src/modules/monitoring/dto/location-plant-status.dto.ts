import { ApiProperty } from '@nestjs/swagger';

export type PlantStatusType = 'ok' | 'due_soon' | 'overdue' | 'unknown';

/**
 * Per-species breakdown in area plant status response.
 */
export class LocationPlantSpeciesSummaryDto {
  @ApiProperty({
    description: 'UUID of the plant species',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  speciesId: string;

  @ApiProperty({
    description: 'Species identifier (e.g., trembesi, bougainvillea)',
    example: 'trembesi',
  })
  speciesName: string;

  @ApiProperty({
    description: 'Total count of this species in the area',
    example: 5,
    minimum: 0,
  })
  count: number;

  @ApiProperty({
    description: 'Next scheduled pruning date (null if never pruned or no cycle defined)',
    example: '2026-05-27T00:00:00Z',
    required: false,
    nullable: true,
  })
  nextDueAt: Date | null;

  @ApiProperty({
    description: 'Status classification for pruning schedule',
    enum: ['ok', 'due_soon', 'overdue', 'unknown'],
    example: 'due_soon',
  })
  status: PlantStatusType;
}

/**
 * Location-level plant maintenance status response.
 */
export class LocationPlantStatusDto {
  @ApiProperty({
    description: 'UUID of the area',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  locationId: string;

  @ApiProperty({
    description: 'Total count of all plants in the area',
    example: 16,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Count of plants with status="ok" (not due soon)',
    example: 5,
    minimum: 0,
  })
  ok: number;

  @ApiProperty({
    description: 'Count of plants with status="due_soon" (within 14-day window)',
    example: 8,
    minimum: 0,
  })
  due_soon: number;

  @ApiProperty({
    description: 'Count of plants with status="overdue" (past due date)',
    example: 2,
    minimum: 0,
  })
  overdue: number;

  @ApiProperty({
    description: 'Count of plants with status="unknown" (never pruned or no cycle)',
    example: 1,
    minimum: 0,
  })
  unknown: number;

  @ApiProperty({
    description: 'Per-species breakdown of plant statuses',
    type: [LocationPlantSpeciesSummaryDto],
  })
  plants: LocationPlantSpeciesSummaryDto[];
}
