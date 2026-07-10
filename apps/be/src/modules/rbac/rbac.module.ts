import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermissionsService } from './services/role-permissions.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

/**
 * RbacModule — data-driven roles & permissions (ADR-044).
 *
 * Global so `PermissionsGuard` + `RolePermissionsService` are injectable in any
 * controller (`@UseGuards(JwtAuthGuard, PermissionsGuard)`) without per-module
 * imports, matching how the existing guards are consumed.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  providers: [RolePermissionsService, PermissionsGuard],
  exports: [RolePermissionsService, PermissionsGuard, TypeOrmModule],
})
export class RbacModule {}
