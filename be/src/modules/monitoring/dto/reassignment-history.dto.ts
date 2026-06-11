import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReassignmentHistoryEntryDto {
  @ApiProperty({ example: 'audit-log-uuid', description: 'Audit log ID' })
  id: string;

  @ApiPropertyOptional({ example: 'area-1', description: 'Previous area ID (null if unknown)' })
  previous_area_id: string | null;

  @ApiPropertyOptional({ example: 'Taman Bungkul', description: 'Previous area name' })
  previous_area_name: string | null;

  @ApiProperty({ example: 'area-2', description: 'New area ID' })
  new_area_id: string;

  @ApiProperty({ example: 'Taman Sapran', description: 'New area name' })
  new_area_name: string;

  @ApiPropertyOptional({ example: 'Rebalancing staffing', description: 'Reason for reassignment' })
  reason: string | null;

  @ApiPropertyOptional({ example: '2026-06-11', description: 'Effective date (YYYY-MM-DD)' })
  effective_date: string | null;

  @ApiProperty({
    example: 'admin-uuid',
    description: 'Actor (person who performed reassignment) ID',
  })
  actor_id: string;

  @ApiProperty({ example: 'Admin User', description: 'Actor full name' })
  actor_name: string;

  @ApiProperty({ example: '2026-06-11T10:30:00Z', description: 'When reassignment was logged' })
  created_at: Date;
}

export class ReassignmentHistoryResponseDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  user_id: string;

  @ApiProperty({
    type: [ReassignmentHistoryEntryDto],
    description: 'Up to 20 reassignment entries (DESC by created_at)',
  })
  history: ReassignmentHistoryEntryDto[];
}
