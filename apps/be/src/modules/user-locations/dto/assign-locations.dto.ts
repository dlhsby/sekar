import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignLocationsDto {
  @ApiProperty({
    description: 'Array of location IDs to assign',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  // Location ids are deterministic UUID v5 (minted from district:name), so restrict to
  // any UUID version — 'v4' wrongly rejects every seeded area id.
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  location_ids: string[];
}
