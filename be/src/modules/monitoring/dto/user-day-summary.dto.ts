import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from '../entities/user-tracking-status.entity';

export class ShiftInfoDto {
  @ApiProperty({ example: 'shift-uuid' })
  id: string;

  @ApiProperty({ example: 'Shift 1' })
  name: string;

  @ApiProperty({ example: '2024-01-24T06:00:00Z' })
  clock_in_time: Date;

  @ApiPropertyOptional({ example: '2024-01-24T14:00:00Z' })
  clock_out_time: Date | null;

  @ApiProperty({ example: 480 })
  duration_minutes: number;

  @ApiProperty({ example: false })
  outside_boundary: boolean;
}

export class LastLocationDto {
  @ApiProperty({ example: -7.2575 })
  latitude: number;

  @ApiProperty({ example: 112.7521 })
  longitude: number;

  @ApiPropertyOptional({ example: 10 })
  accuracy: number | null;

  @ApiPropertyOptional({ example: 85 })
  battery_level: number | null;

  @ApiProperty({ example: '2024-01-24T10:25:00Z' })
  logged_at: Date;

  @ApiProperty({ example: true })
  is_within_area: boolean;
}

export class ActivitySummaryDto {
  @ApiProperty({ example: 'activity-uuid' })
  id: string;

  @ApiProperty({ example: 'Watering plants' })
  title: string;

  @ApiProperty({ example: 'maintenance' })
  activity_type: string;

  @ApiProperty({ example: '2024-01-24T08:30:00Z' })
  created_at: Date;

  @ApiPropertyOptional({ example: 'https://s3.example.com/photo.jpg' })
  photo_url: string | null;
}

export class TaskSummaryItemDto {
  @ApiProperty({ example: 'task-uuid' })
  id: string;

  @ApiProperty({ example: 'Clean fountain area' })
  title: string;

  @ApiProperty({ example: 'in_progress' })
  status: string;

  @ApiProperty({ example: 'high' })
  priority: string;
}

export class WhatsAppLinksDto {
  @ApiProperty({ example: 'https://wa.me/6281234567890' })
  chat: string;

  @ApiProperty({ example: 'tel:+6281234567890' })
  call: string;
}

export class UserDaySummaryDto {
  @ApiProperty({ example: 'user-uuid' })
  user_id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: 'worker1' })
  username: string;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiPropertyOptional({ example: '081234567890' })
  phone: string | null;

  @ApiProperty({ enum: TrackingStatus, example: 'active' })
  status: TrackingStatus;

  @ApiPropertyOptional({ example: 'area-uuid' })
  area_id: string | null;

  @ApiPropertyOptional({ example: 'Taman Bungkul' })
  area_name: string | null;

  @ApiPropertyOptional({ example: 'rayon-uuid' })
  rayon_id: string | null;

  @ApiPropertyOptional({ example: 'Rayon Selatan' })
  rayon_name: string | null;

  @ApiPropertyOptional({ type: ShiftInfoDto })
  shift: ShiftInfoDto | null;

  @ApiPropertyOptional({ type: LastLocationDto })
  last_location: LastLocationDto | null;

  @ApiProperty({ type: [ActivitySummaryDto] })
  activities_today: ActivitySummaryDto[];

  @ApiProperty({ type: [TaskSummaryItemDto] })
  tasks_today: TaskSummaryItemDto[];

  @ApiPropertyOptional({ type: WhatsAppLinksDto })
  whatsapp_links: WhatsAppLinksDto | null;
}
