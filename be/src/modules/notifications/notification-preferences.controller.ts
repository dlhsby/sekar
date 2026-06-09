import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Per-user notification preferences (Phase 4-3, §D2).
 *
 * A user may read/write their OWN preferences; system admins (`USER_MANAGERS`)
 * may read/write anyone's. Returns the full configurable set (default-on) so
 * the mobile screen renders every toggle.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('users/:id/notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({ summary: "Get a user's notification preferences (self or admin)" })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Full per-type preference list' })
  @ApiResponse({ status: 403, description: 'Forbidden — not self and not an admin' })
  async get(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    this.assertCanAccess(id, user);
    return this.preferencesService.getForUser(id);
  }

  @Patch()
  @ApiOperation({ summary: "Bulk-update a user's notification preferences (self or admin)" })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Effective preference list after update' })
  @ApiResponse({ status: 403, description: 'Forbidden — not self and not an admin' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    this.assertCanAccess(id, user);
    return this.preferencesService.updateForUser(id, dto.preferences);
  }

  /**
   * Owner-or-admin gate. System admins may manage anyone; everyone else only
   * themselves.
   */
  private assertCanAccess(targetUserId: string, user: User): void {
    if (targetUserId !== user.id && !USER_MANAGERS.includes(user.role)) {
      throw new ForbiddenException('You can only access your own notification preferences');
    }
  }
}
