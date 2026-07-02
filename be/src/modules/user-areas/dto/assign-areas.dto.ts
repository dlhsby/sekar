import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AssignAreasDto {
  @ApiProperty({
    description: 'Array of area IDs to assign',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  // Area ids are deterministic UUID v5 (minted from rayon:name), so restrict to
  // any UUID version — 'v4' wrongly rejects every seeded area id.
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  area_ids: string[];
}
