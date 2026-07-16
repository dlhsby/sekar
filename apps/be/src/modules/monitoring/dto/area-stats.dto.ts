import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from '../entities/user-tracking-status.entity';

export class UserStatusDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiPropertyOptional({ example: '08123456789', nullable: true })
  phone: string | null;

  @ApiProperty({ enum: TrackingStatus, example: 'active' })
  status: TrackingStatus;

  @ApiProperty({ example: -7.2575 })
  last_lat: number | null;

  @ApiProperty({ example: 112.7521 })
  last_lng: number | null;

  @ApiProperty({ example: '2024-01-24T10:25:00Z' })
  last_location_update: Date | null;

  @ApiProperty({ example: true })
  is_within_area: boolean;

  @ApiProperty({ example: 'shift-uuid' })
  current_shift_id: string | null;

  @ApiPropertyOptional({ example: 'Shift Pagi', nullable: true })
  shift_name: string | null;

  @ApiProperty({ example: '2024-01-24T06:00:00Z' })
  clock_in_time: Date | null;
}

export class TaskSummaryDto {
  @ApiProperty({ example: 'task-uuid' })
  id: string;

  @ApiProperty({ example: 'Clean fountain area' })
  title: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 'high' })
  priority: string;

  @ApiProperty({ example: 'user-uuid' })
  assigned_to: string | null;

  @ApiProperty({ example: 'John Doe' })
  assignee_name: string | null;

  @ApiProperty({ example: '2024-01-24T14:00:00Z' })
  deadline: Date | null;
}

export class StaffRequirementStatusDto {
  @ApiProperty({ example: 'requirement-uuid' })
  id: string;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: 6 })
  required_count: number;

  @ApiProperty({ example: 5 })
  current_count: number;

  @ApiProperty({ example: -1 })
  delta: number;

  @ApiProperty({ example: false })
  is_met: boolean;

  @ApiProperty({ example: 3, description: 'Clocked in and reachable' })
  active_count: number;

  @ApiProperty({ example: 1, description: 'Clocked in but unreachable past the threshold' })
  offline_count: number;
}

export class AreaStatsDto {
  @ApiProperty({ example: 'area-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({ example: 'Taman' })
  area_type: string;

  @ApiProperty({ example: 'active' })
  area_type_category: string;

  @ApiProperty({ example: 'rayon-uuid' })
  rayon_id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  rayon_name: string;

  @ApiProperty({ example: -7.2575 })
  latitude: number;

  @ApiProperty({ example: 112.7521 })
  longitude: number;

  @ApiProperty({ example: 2500 })
  coverage_area: number | null;

  @ApiProperty({ example: 6 })
  total_users_assigned: number;

  @ApiProperty({ example: 5 })
  users_online: number;

  @ApiProperty({ example: 1 })
  users_offline: number;

  @ApiProperty({ example: false })
  is_fully_staffed: boolean;

  @ApiProperty({ type: [StaffRequirementStatusDto] })
  staff_requirements: StaffRequirementStatusDto[];

  @ApiProperty({ type: [UserStatusDto] })
  users: UserStatusDto[];

  @ApiProperty({ example: 5 })
  tasks_total: number;

  @ApiProperty({ example: 2 })
  tasks_pending: number;

  @ApiProperty({ example: 1 })
  tasks_in_progress: number;

  @ApiProperty({ example: 2 })
  tasks_completed_today: number;

  @ApiProperty({ type: [TaskSummaryDto] })
  active_tasks: TaskSummaryDto[];

  @ApiProperty({ example: 8 })
  activities_submitted_today: number;

  @ApiProperty({ example: ['Understaffed: need 1 more satgas'] })
  alerts: string[];

  @ApiProperty({ example: 'WEEKDAY', enum: ['WEEKDAY', 'WEEKEND', 'HOLIDAY'] })
  current_day_type: string;

  @ApiProperty({ example: 'Hari Kerja' })
  current_day_type_label: string;

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
