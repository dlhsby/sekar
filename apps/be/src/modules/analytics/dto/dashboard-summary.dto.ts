import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class TodayMetrics {
  @ApiProperty({ description: 'Today attendance rate (%)', example: 85 })
  attendanceRate: number;

  @ApiProperty({ description: 'Active workers today', example: 42 })
  activeWorkers: number;

  @ApiProperty({ description: 'Tasks completed today', example: 18 })
  tasksCompleted: number;

  @ApiProperty({ description: 'Activities submitted today', example: 35 })
  activitiesSubmitted: number;

  @ApiProperty({ description: 'Open tasks', example: 12 })
  openTasks: number;

  @ApiProperty({ description: 'Overtime hours today', example: 8.5 })
  overtimeHours: number;
}

class TrendMetrics {
  @ApiProperty({
    description: 'Attendance rate trend (last 7 days)',
    type: [Number],
    example: [80, 82, 85, 83, 84, 85, 85],
  })
  attendance: number[];

  @ApiProperty({
    description: 'Task completion trend (last 7 days)',
    type: [Number],
    example: [15, 16, 18, 17, 19, 18, 18],
  })
  taskCompletion: number[];

  @ApiProperty({
    description: 'Activities submitted trend (last 7 days)',
    type: [Number],
    example: [30, 32, 35, 33, 36, 35, 35],
  })
  activities: number[];
}

class AlertItem {
  @ApiProperty({ description: 'Location ID', example: 'area-123' })
  locationId: string;

  @ApiProperty({ description: 'Location name', example: 'Taman Utara' })
  areaName: string;

  @ApiProperty({ description: 'Staffing deficit count', example: 2 })
  deficit: number;
}

class Alerts {
  @ApiProperty({ description: 'Understaffed areas (>20% under requirement)', type: [AlertItem] })
  understaffedAreas: AlertItem[];

  @ApiProperty({ description: 'Overdue maintenance count', example: 3 })
  overdueMaintenances: number;

  @ApiProperty({ description: 'Missing workers count', example: 5 })
  missingWorkers: number;

  @ApiProperty({ description: 'Overdue tasks count', example: 7 })
  overdueTasks: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Today metrics', type: TodayMetrics })
  @Type(() => TodayMetrics)
  @Expose()
  today: TodayMetrics;

  @ApiProperty({ description: 'Trend metrics', type: TrendMetrics })
  @Type(() => TrendMetrics)
  @Expose()
  trends: TrendMetrics;

  @ApiProperty({ description: 'Alerts requiring attention', type: Alerts })
  @Type(() => Alerts)
  @Expose()
  alerts: Alerts;
}
