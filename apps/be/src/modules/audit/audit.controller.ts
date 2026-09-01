import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuditLogService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { USER_MANAGERS } from '../users/constants/role-groups';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Get all audit logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async findAll(@Query() filters: AuditFilterDto) {
    return this.auditLogService.findAllPaginated(filters);
  }

  @Get(':entityType/:entityId')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON)
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (task, activity, overtime, shift)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Audit trail for entity' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditLogService.getEntityHistory(entityType, entityId);
  }
}
