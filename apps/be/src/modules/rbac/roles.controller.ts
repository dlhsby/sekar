import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RolesService } from './services/roles.service';
import { RoleView } from './dto/role-view.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Role management (ADR-044). Gated by the new permission model
 * (`@RequirePermissions` + `PermissionsGuard`) — the first surface to use it,
 * while existing controllers keep `@Roles`/`RolesGuard`.
 */
@ApiTags('roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'List all roles with permission keys + counts' })
  @ApiResponse({ status: 200, type: [RoleView] })
  list(): Promise<RoleView[]> {
    return this.rolesService.list();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Get a role by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: RoleView })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleView> {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, type: RoleView })
  create(@Body() dto: CreateRoleDto, @GetUser() user: User): Promise<RoleView> {
    return this.rolesService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: 'Update a role (label / scope / marker / permissions)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: RoleView })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @GetUser() user: User,
  ): Promise<RoleView> {
    return this.rolesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role (system roles cannot be deleted)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 400, description: 'System role or role in use' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}
