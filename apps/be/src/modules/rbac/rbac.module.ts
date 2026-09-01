import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermissionsService } from './services/role-permissions.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * RbacModule — data-driven roles & permissions (ADR-044).
 *
 * Global so `PermissionsGuard` + `RolePermissionsService` are injectable in any
 * controller (`@UseGuards(JwtAuthGuard, PermissionsGuard)`) without per-module
 * imports, matching how the existing guards are consumed. Also hosts the
 * role-management + permission-catalog API.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission]), AuditModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolePermissionsService, RolesService, PermissionsService, PermissionsGuard],
  exports: [RolePermissionsService, PermissionsGuard, TypeOrmModule],
})
export class RbacModule {}
