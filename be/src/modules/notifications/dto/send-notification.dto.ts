import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

/**
 * DTO for sending notification to a specific user
 */
export class SendNotificationDto {
  @ApiProperty({
    description: 'Target user ID',
    example: 'user-uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Task Assigned',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example: 'You have been assigned a new task: Clean Taman Bungkul',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Notification type',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { task_id: 'uuid', action: 'open_task' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
