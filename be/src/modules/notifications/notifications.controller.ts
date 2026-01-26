import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UnregisterTokenDto } from './dto/unregister-token.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Controller for notification management
 *
 * Provides endpoints for:
 * - Device token registration/unregistration
 * - Listing user notifications
 * - Broadcasting notifications (Admin only)
 * - Marking notifications as read
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Register FCM device token
   */
  @Post('register')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Token registered successfully',
    type: NotificationToken,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerToken(
    @Body() dto: RegisterTokenDto,
    @GetUser() user: User,
  ): Promise<NotificationToken> {
    return this.notificationsService.registerToken(dto, user.id);
  }

  /**
   * Unregister FCM device token
   */
  @Delete('unregister')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister FCM device token' })
  @ApiResponse({ status: 204, description: 'Token unregistered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async unregisterToken(@Body() dto: UnregisterTokenDto, @GetUser() user: User): Promise<void> {
    return this.notificationsService.unregisterToken(dto.fcm_token, user.id);
  }

  /**
   * Broadcast notification to users
   */
  @Post('broadcast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Broadcast notification to multiple users (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Broadcast sent successfully',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number', example: 10 },
        failed: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async broadcast(
    @Body() dto: BroadcastNotificationDto,
  ): Promise<{ sent: number; failed: number }> {
    return this.notificationsService.broadcast(dto);
  }

  /**
   * Get user's notifications
   */
  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: [Notification],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(
    @GetUser() user: User,
    @Query() filters: NotificationFilterDto,
  ): Promise<Notification[]> {
    return this.notificationsService.getUserNotifications(user.id, filters);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Unread count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@GetUser() user: User): Promise<{ count: number }> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: Notification,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        marked: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@GetUser() user: User): Promise<{ marked: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
