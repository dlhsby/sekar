import { IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { NotificationType } from '../entities/notification.entity';

/**
 * DTO for filtering notifications
 */
export class NotificationFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_read?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Filter notifications created after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  created_after?: string;

  @ApiPropertyOptional({
    description: 'Filter notifications created before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  created_before?: string;
}
