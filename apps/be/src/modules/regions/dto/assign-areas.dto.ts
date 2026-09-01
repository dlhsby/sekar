import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAreasDto {
  @ApiProperty({ type: [String], description: 'Location ids to re-parent into this region' })
  @IsArray()
  @IsUUID('all', { each: true })
  locationIds: string[];
}
