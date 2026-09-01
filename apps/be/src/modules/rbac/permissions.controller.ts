import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService, PermissionCatalogCategory } from './services/permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

/**
 * Permission catalog for the role-management UI (ADR-044). Read-only —
 * permissions are defined in the code-side catalog, not created at runtime.
 */
@ApiTags('permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: 'Grouped permission catalog (Category → Resource → action)' })
  @ApiResponse({ status: 200, description: 'Grouped catalog' })
  getCatalog(): PermissionCatalogCategory[] {
    return this.permissionsService.getCatalog();
  }
}
