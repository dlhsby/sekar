import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { auditContext } from '../../common/context/audit-context';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import { AuditLogService } from '../audit/audit.service';
import { RolePermissionsService } from '../rbac/services/role-permissions.service';
import { hasPermission } from '../rbac/permission-matcher';
import type { User } from '../users/entities/user.entity';
import { ScheduleCascade } from './schedule-cascade';
import { DELETE_PLANS, type DeletableType, type Impact } from './deletion-plans';
import type { ForceDeleteDto } from './dto/force-delete.dto';

type Row = { id: string } & Record<string, unknown>;

export interface ImpactView {
  type: DeletableType;
  id: string;
  /** Exactly what the operator must type to confirm. */
  confirm_label: string;
  impact: Impact;
  /** Dependants that must be moved to a replacement first (0 = none). */
  replacement_required: number;
}

export interface DeleteResult extends ImpactView {
  audit_id: string;
}

/**
 * Force delete (ADR-062): soft-delete a record that is still in use, cancelling
 * only its FUTURE (tomorrow onward) — past attendance, reports and roster rows
 * are never rewritten. One transaction; one root `force_delete` audit row whose
 * id is the `parent_id` of every row the cascade writes.
 */
@Injectable()
export class DeletionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async impact(type: DeletableType, id: string, actor: User): Promise<ImpactView> {
    await this.assertPermitted(type, actor);
    const m = this.dataSource.manager;
    const row = await this.load(m, type, id);
    return this.view(m, type, row, this.cascade(m, actor));
  }

  async forceDelete(
    type: DeletableType,
    id: string,
    dto: ForceDeleteDto,
    actor: User,
  ): Promise<DeleteResult> {
    await this.assertPermitted(type, actor);
    const plan = DELETE_PLANS[type];

    return this.dataSource.transaction(async (m) => {
      const row = await this.load(m, type, id);
      this.assertDeletable(type, row, actor);
      this.assertConfirmed(plan.label(row), dto.confirm_name);
      const before = await this.view(m, type, row, this.cascade(m, actor));
      await this.assertReplacement(m, type, row, before.replacement_required, dto.replacement_id);

      const root = await auditContext.annotate({ reason: dto.reason }, () =>
        this.auditLog.log(
          {
            entity_type: type,
            entity_id: row.id,
            entity_label: before.confirm_label,
            action: 'force_delete',
            metadata: { planned: before.impact, replacement_id: dto.replacement_id ?? null },
          },
          m,
        ),
      );

      const done = await auditContext.annotate({ reason: dto.reason, parentId: root.id }, () =>
        plan.execute(
          {
            manager: m,
            cascade: this.cascade(m, actor),
            actorId: actor.id,
            replacementId: dto.replacement_id,
          },
          row,
        ),
      );

      return { ...before, impact: done, audit_id: root.id };
    });
  }

  private cascade(m: EntityManager, actor: User): ScheduleCascade {
    return new ScheduleCascade(m, TimezoneUtil.jakartaDateString(), actor.id);
  }

  private async view(
    m: EntityManager,
    type: DeletableType,
    row: Row,
    cascade: ScheduleCascade,
  ): Promise<ImpactView> {
    const plan = DELETE_PLANS[type];
    return {
      type,
      id: row.id,
      confirm_label: plan.label(row),
      impact: await plan.impact(m, cascade, row),
      replacement_required: plan.needsReplacement ? await plan.needsReplacement(m, row) : 0,
    };
  }

  private async load(m: EntityManager, type: DeletableType, id: string): Promise<Row> {
    const row = (await m.findOne(DELETE_PLANS[type].entity, { where: { id } })) as Row | null;
    if (!row) throw new NotFoundException(`${type} not found`);
    return row;
  }

  private async assertPermitted(type: DeletableType, actor: User): Promise<void> {
    const granted = await this.rolePermissions.getRolePermissionKeys(actor.role);
    const required = DELETE_PLANS[type].permission;
    if (!hasPermission(granted, required)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.FORBIDDEN,
        `Requires permission(s): ${required}`,
      );
    }
  }

  private assertDeletable(type: DeletableType, row: Row, actor: User): void {
    const selfDelete = type === 'user' && row.id === actor.id;
    const systemRole = type === 'role' && row.is_system === true;
    const superadminByOther =
      type === 'user' && row.role === 'superadmin' && actor.role !== 'superadmin';
    if (selfDelete || systemRole || superadminByOther) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.DELETE_NOT_ALLOWED,
        'This record cannot be deleted',
      );
    }
  }

  private assertConfirmed(expected: string, typed: string): void {
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
    if (!expected || norm(expected) !== norm(typed)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.DELETE_CONFIRMATION_MISMATCH,
        'Confirmation does not match the record name',
      );
    }
  }

  private async assertReplacement(
    m: EntityManager,
    type: DeletableType,
    row: Row,
    required: number,
    replacementId?: string,
  ): Promise<void> {
    if (required === 0) return;
    const valid =
      !!replacementId &&
      replacementId !== row.id &&
      !!(await m.findOne(DELETE_PLANS[type].entity, { where: { id: replacementId } }));
    if (!valid) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ApiErrorCode.DELETE_REPLACEMENT_REQUIRED,
        `${required} record(s) still use this ${type}; choose a replacement`,
      );
    }
  }
}
