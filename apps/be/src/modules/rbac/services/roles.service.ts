import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleView } from '../dto/role-view.dto';
import { MonitoringScope } from '../enums/monitoring-scope.enum';
import { RolePermissionsService } from './role-permissions.service';
import { AuditLogService } from '../../audit/audit.service';

/**
 * CRUD for data-driven roles (ADR-044). System roles (`is_system`) may have
 * their label/scope/marker/permissions edited but cannot be deleted, and their
 * immutable `code` is never changed. Editing a role's permissions invalidates
 * its cached permission set so the change takes effect immediately.
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly rolePermissions: RolePermissionsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<RoleView[]> {
    const roles = await this.roleRepo.find({
      relations: ['permissions'],
      order: { is_system: 'DESC', name: 'ASC' },
    });
    const counts = await this.userCountsByRole();
    return roles.map((r) => this.toView(r, counts.get(r.code) ?? 0));
  }

  async findOne(id: string): Promise<RoleView> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) throw new NotFoundException('Role not found');
    const counts = await this.userCountsByRole();
    return this.toView(role, counts.get(role.code) ?? 0);
  }

  async create(dto: CreateRoleDto, actorId?: string): Promise<RoleView> {
    const code = await this.generateUniqueCode(dto.name);
    const permissions = await this.resolvePermissions(dto.permissionKeys);

    const role = this.roleRepo.create({
      code,
      name: dto.name.trim(),
      description: dto.description,
      is_system: false,
      monitoring_scope: dto.monitoring_scope ?? MonitoringScope.NONE,
      marker_icon: dto.marker_icon,
      marker_color: dto.marker_color,
      permissions,
      created_by: actorId,
      updated_by: actorId,
    });
    let saved: Role;
    try {
      saved = await this.roleRepo.save(role);
    } catch (err) {
      // Unique-violation race on the generated code (two concurrent creates).
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('A role with this code was just created — please retry');
      }
      throw err;
    }
    await this.recordAudit('create', saved.id, actorId, null, {
      code: saved.code,
      name: saved.name,
      permissionKeys: (permissions ?? []).map((p) => p.key).sort(),
    });
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string): Promise<RoleView> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) throw new NotFoundException('Role not found');

    // The superadmin role must always keep its full grant — narrowing it would
    // let a role editor lock every operator (including superadmin) out.
    if (dto.permissionKeys !== undefined && role.code === 'superadmin') {
      throw new BadRequestException('The superadmin role permissions cannot be modified');
    }

    const oldValue = {
      name: role.name,
      monitoring_scope: role.monitoring_scope,
      permissionKeys: (role.permissions ?? []).map((p) => p.key).sort(),
    };

    if (dto.name !== undefined) role.name = dto.name.trim();
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.monitoring_scope !== undefined) role.monitoring_scope = dto.monitoring_scope;
    if (dto.marker_icon !== undefined) role.marker_icon = dto.marker_icon;
    if (dto.marker_color !== undefined) role.marker_color = dto.marker_color;
    if (dto.permissionKeys !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissionKeys);
    }
    role.updated_by = actorId;

    await this.roleRepo.save(role);
    await this.rolePermissions.invalidateRole(role.code);
    await this.recordAudit('update', role.id, actorId, oldValue, {
      name: role.name,
      monitoring_scope: role.monitoring_scope,
      permissionKeys: (role.permissions ?? []).map((p) => p.key).sort(),
    });
    return this.findOne(role.id);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.is_system) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const inUse = await this.roleRepo.manager.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE role = $1 AND deleted_at IS NULL`,
      [role.code],
    );
    if ((inUse[0]?.count ?? 0) > 0) {
      throw new BadRequestException('Role is assigned to users and cannot be deleted');
    }
    // softRemove (not softDelete) so the AuditSubscriber stamps deleted_by from
    // the request actor — matching the codebase convention (see districts.service).
    await this.roleRepo.softRemove(role);
    await this.rolePermissions.invalidateRole(role.code);
    await this.recordAudit('delete', role.id, actorId, { code: role.code, name: role.name }, null);
  }

  /** Best-effort change audit (ADR-015) — a failed audit write never fails the mutation. */
  private async recordAudit(
    action: 'create' | 'update' | 'delete',
    roleId: string,
    actorId: string | undefined,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
  ): Promise<void> {
    if (!actorId) return; // audit_logs.actor_id is a required FK
    try {
      await this.auditLog.log({
        entity_type: 'role',
        entity_id: roleId,
        action,
        actor_id: actorId,
        old_value: oldValue,
        new_value: newValue,
      });
    } catch {
      // Non-fatal: the mutation already succeeded.
    }
  }

  /** Resolve permission keys to rows; reject unknown keys so grants never silently no-op. */
  private async resolvePermissions(keys?: string[]): Promise<Permission[]> {
    if (!keys || keys.length === 0) return [];
    const unique = Array.from(new Set(keys));
    const found = await this.permissionRepo.find({ where: { key: In(unique) } });
    if (found.length !== unique.length) {
      const known = new Set(found.map((p) => p.key));
      const unknown = unique.filter((k) => !known.has(k));
      throw new BadRequestException(`Unknown permission key(s): ${unknown.join(', ')}`);
    }
    return found;
  }

  private async generateUniqueCode(name: string): Promise<string> {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'role';
    let code = base;
    let n = 2;
    // withDeleted so a soft-deleted role's code isn't silently reused.
    while (await this.roleRepo.findOne({ where: { code }, withDeleted: true })) {
      code = `${base}_${n++}`;
      if (n > 1000) throw new ConflictException('Unable to generate a unique role code');
    }
    return code;
  }

  private async userCountsByRole(): Promise<Map<string, number>> {
    const rows = (await this.roleRepo.manager.query(
      `SELECT role, COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL GROUP BY role`,
    )) as Array<{ role: string; count: number }>;
    return new Map(rows.map((r) => [r.role, r.count]));
  }

  private toView(role: Role, userCount: number): RoleView {
    const permissionKeys = (role.permissions ?? []).map((p) => p.key).sort();
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      monitoring_scope: role.monitoring_scope,
      marker_icon: role.marker_icon,
      marker_color: role.marker_color,
      permissionKeys,
      permissionCount: permissionKeys.length,
      userCount,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }
}
