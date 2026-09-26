import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditLogService } from './audit.service';
import { AuditChainService } from './audit-chain.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { toAuditCsv } from './audit-csv';
import { auditableTypes } from './capture/auditable.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolePermissionsService } from '../rbac/services/role-permissions.service';
import { hasPermission } from '../rbac/permission-matcher';
import { USER_MANAGERS } from '../users/constants/role-groups';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AuditController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditChain: AuditChainService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Search the audit trail (who did what, when, with field diffs)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async findAll(@Query() filters: AuditFilterDto) {
    return this.auditLogService.findAllPaginated(filters);
  }

  @Get('types')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Entity types captured automatically (for the filter UI)' })
  types(): string[] {
    return auditableTypes();
  }

  @Get('verify')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Verify the tamper-evident hash chain (ADR-061)' })
  verify() {
    return this.auditChain.verify();
  }

  @Get('export.csv')
  @RequirePermissions('audit:read')
  @ApiProduces('text/csv')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Export the filtered audit trail as CSV (the export itself is audited)',
  })
  async exportCsv(@Query() filters: AuditFilterDto, @Res() res: Response): Promise<void> {
    const { rows, truncated } = await this.auditLogService.findForExport(filters);
    await this.auditLogService.log({
      entity_type: 'audit_log',
      action: 'export',
      metadata: { filters: { ...filters }, rows: rows.length, truncated },
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${stamp}.csv"`);
    if (truncated) res.setHeader('X-Export-Truncated', 'true');
    res.send(toAuditCsv(rows));
  }

  @Get(':entityType/:entityId')
  @Roles(
    ...USER_MANAGERS,
    UserRole.MANAGEMENT,
    UserRole.KORLAP,
    UserRole.KEPALA_RAYON,
    UserRole.ADMIN_RAYON,
  )
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (task, activity, district, user, …)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Audit trail for entity' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @GetUser() user: User,
  ) {
    // Operational timelines (task, activity, …) follow entity access (ADR-015).
    // Master-data/user change history carries field diffs, so it needs audit:read.
    if (auditableTypes().includes(entityType)) {
      const granted = await this.rolePermissions.getRolePermissionKeys(user.role);
      if (!hasPermission(granted, 'audit:read')) {
        throw new ForbiddenException('Requires permission(s): audit:read');
      }
    }
    return this.auditLogService.getEntityHistory(entityType, entityId);
  }
}
