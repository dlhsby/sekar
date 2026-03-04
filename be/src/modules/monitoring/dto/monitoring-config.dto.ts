import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class MonitoringConfigDto {
  @ApiProperty({ example: 'status_thresholds' })
  key: string;

  @ApiProperty({ example: { active_max_age_seconds: 300 } })
  value: Record<string, any>;

  @ApiProperty({ example: 'Status calculation thresholds' })
  description: string;

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  updated_at: Date;
}

export class MonitoringConfigResponseDto {
  @ApiProperty({ type: [MonitoringConfigDto] })
  configs: MonitoringConfigDto[];
}

export class UpdateMonitoringConfigDto {
  @ApiProperty({
    description: 'Configuration value object. Validated by Zod schema per key.',
    example: { active_max_age_seconds: 300, inactive_threshold_seconds: 900 },
  })
  @IsObject()
  value: Record<string, any>;
}
