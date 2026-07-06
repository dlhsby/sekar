import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserAreasService } from './user-areas.service';
import { AssignAreasDto } from './dto/assign-areas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

@ApiTags('user-areas')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserAreasController {
  constructor(private readonly userAreasService: UserAreasService) {}

  @Get('users/:userId/areas')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: "Get user's assigned areas" })
  @ApiResponse({ status: 200, description: 'List of assigned areas' })
  async getUserAreas(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.userAreasService.getEffectiveAreas(userId);
  }

  @Post('users/:userId/areas')
  @Roles(...USER_MANAGERS, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Assign areas to user' })
  @ApiResponse({ status: 201, description: 'Areas assigned' })
  async assignAreas(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignAreasDto,
    @GetUser() currentUser: User,
  ) {
    return this.userAreasService.assignAreas(userId, dto.area_ids, currentUser.id);
  }

  @Delete('users/:userId/areas/:areaId')
  @Roles(...USER_MANAGERS, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Remove area assignment' })
  @ApiResponse({ status: 200, description: 'Assignment removed' })
  async removeAssignment(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('areaId', ParseUUIDPipe) areaId: string,
  ) {
    await this.userAreasService.removeAssignment(userId, areaId);
    return { success: true };
  }

  @Get('areas/:areaId/users')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Get users assigned to an area' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getAreaUsers(@Param('areaId', ParseUUIDPipe) areaId: string) {
    return this.userAreasService.getUsersByArea(areaId);
  }
}
