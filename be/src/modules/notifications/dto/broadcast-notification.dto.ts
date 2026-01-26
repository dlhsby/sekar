import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';
import { UserRole } from '../../users/entities/user.entity';

/**
 * DTO for broadcasting notifications
 */
export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Important Announcement',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example: 'Please check your task assignments for today.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Notification type',
    enum: NotificationType,
    default: NotificationType.ANNOUNCEMENT,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Target roles to receive the notification (empty = all roles)',
    type: [String],
    enum: UserRole,
    example: [UserRole.WORKER, UserRole.LINMAS],
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  target_roles?: UserRole[];

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { action: 'open_tasks', task_id: 'uuid' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
