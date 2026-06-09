import { IsArray, IsBoolean, IsEnum, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

/**
 * A single per-type preference toggle (Phase 4-3, §D2).
 */
export class NotificationPreferenceItemDto {
  @ApiProperty({
    description: 'Notification type to toggle',
    enum: NotificationType,
    example: NotificationType.TASK_ASSIGNED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Whether push for this type is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

/**
 * Bulk-upsert payload for `PATCH /users/:id/notification-preferences`.
 * Types outside the configurable set are ignored server-side.
 */
export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences: NotificationPreferenceItemDto[];
}
