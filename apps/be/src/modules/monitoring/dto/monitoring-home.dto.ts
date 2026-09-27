import { ApiProperty } from '@nestjs/swagger';

export type MonitoringHomeScope = 'city' | 'district' | 'location' | 'none';

/** Where a viewer's monitoring map opens, and the tier they cannot drill above. */
export class MonitoringHomeDto {
  @ApiProperty({ enum: ['city', 'district', 'location', 'none'] })
  scope: MonitoringHomeScope;

  @ApiProperty({
    nullable: true,
    description: 'Id of the landing node (district id for district scope)',
  })
  id: string | null;

  @ApiProperty({ nullable: true })
  district_id: string | null;

  @ApiProperty({
    enum: ['city', 'district', 'location', 'none'],
    description: 'Highest tier the viewer may drill up to',
  })
  floor: MonitoringHomeScope;
}
