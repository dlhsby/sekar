import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog, type AuditOutcome } from './entities/audit-log.entity';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { auditContext } from '../../common/context/audit-context';

/** Hard cap on one CSV export; narrow the filters for more. */
export const EXPORT_MAX_ROWS = 50_000;

export interface LogParams {
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  action: string;
  /** Defaults to the request's actor (audit context). */
  actor_id?: string | null;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  changes?: Record<string, [unknown, unknown]> | null;
  metadata?: Record<string, any> | null;
  reason?: string | null;
  outcome?: AuditOutcome;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Explicit audit entry for domain events (approve, verify, reassign, login,
   * export…) — ADR-015. Plain CRUD on `@Auditable` entities is captured
   * automatically (ADR-061) and must not be logged here too. Actor role/name,
   * IP, user agent and request id are snapshotted from the request context.
   */
  async log(params: LogParams): Promise<AuditLog> {
    const ctx = auditContext.get();
    const actorId = params.actor_id ?? ctx.userId ?? null;
    const sameActor = actorId !== null && actorId === ctx.userId;
    const entry = this.auditLogRepo.create({
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_label: params.entity_label ?? null,
      action: params.action,
      actor_id: actorId,
      // Snapshots only describe the context's actor — never mislabel another id.
      actor_role: sameActor ? (ctx.role ?? null) : null,
      actor_name: sameActor ? (ctx.name ?? null) : null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      changes: params.changes ?? null,
      metadata: params.metadata ?? null,
      reason: params.reason ?? ctx.reason ?? null,
      outcome: params.outcome ?? 'success',
      source: actorId ? 'api' : 'system',
      ip: ctx.ip ?? null,
      user_agent: ctx.userAgent ?? null,
      request_id: ctx.requestId ?? null,
      parent_id: ctx.parentId ?? null,
    });

    const saved = await this.auditLogRepo.save(entry);
    this.logger.debug(`Audit: ${params.entity_type}/${params.entity_id ?? '-'} ${params.action}`);
    return saved;
  }

  /**
   * Timeline for one entity. Joins only the actor's id/name/role — enough for
   * rows written before actor snapshots existed, without leaking the actor's
   * contact details to every role that may read a timeline.
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepo
      .createQueryBuilder('audit')
      .leftJoin('audit.actor', 'actor')
      .addSelect(['actor.id', 'actor.full_name', 'actor.role'])
      .where('audit.entity_type = :entityType', { entityType })
      .andWhere('audit.entity_id = :entityId', { entityId })
      .orderBy('audit.created_at', 'DESC')
      .addOrderBy('audit.seq', 'DESC')
      .getMany();
  }

  async getActorHistory(actorId: string): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { actor_id: actorId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async findAllPaginated(filters: AuditFilterDto): Promise<PaginatedResponseDto<AuditLog>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const qb = this.filtered(filters)
      .orderBy('audit.created_at', 'DESC')
      .addOrderBy('audit.seq', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /** Rows for a CSV export (newest first, capped), plus whether the cap cut it. */
  async findForExport(filters: AuditFilterDto): Promise<{ rows: AuditLog[]; truncated: boolean }> {
    const rows = await this.filtered(filters)
      .orderBy('audit.created_at', 'DESC')
      .addOrderBy('audit.seq', 'DESC')
      .take(EXPORT_MAX_ROWS + 1)
      .getMany();
    return { rows: rows.slice(0, EXPORT_MAX_ROWS), truncated: rows.length > EXPORT_MAX_ROWS };
  }

  private filtered(filters: AuditFilterDto): SelectQueryBuilder<AuditLog> {
    const qb = this.auditLogRepo.createQueryBuilder('audit');
    const eq: Array<[keyof AuditFilterDto, string]> = [
      ['entity_type', 'entity_type'],
      ['entity_id', 'entity_id'],
      ['action', 'action'],
      ['actor_id', 'actor_id'],
      ['actor_role', 'actor_role'],
      ['outcome', 'outcome'],
    ];
    for (const [key, column] of eq) {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        qb.andWhere(`audit.${column} = :${column}`, { [column]: value });
      }
    }
    if (filters.from_date) {
      qb.andWhere('audit.created_at >= :fromDate', { fromDate: filters.from_date });
    }
    if (filters.to_date) {
      qb.andWhere('audit.created_at <= :toDate', { toDate: filters.to_date });
    }
    if (filters.q) {
      const like = `%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      qb.andWhere('(audit.entity_label ILIKE :like OR audit.actor_name ILIKE :like)', { like });
    }
    return qb;
  }
}
