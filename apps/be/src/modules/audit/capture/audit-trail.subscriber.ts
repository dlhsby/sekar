import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityMetadata,
  EntitySubscriberInterface,
  InsertEvent,
  QueryDeepPartialEntity,
  RecoverEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { auditContext } from '../../../common/context/audit-context';
import { AuditLog } from '../entities/audit-log.entity';
import { auditableOptions } from './auditable.decorator';
import { buildAuditRow, type CaptureKind } from './audit-row';

type Row = Record<string, unknown>;

/**
 * Writes an audit_logs row for every entity event on an `@Auditable` entity,
 * through the event's own EntityManager — i.e. inside the same transaction as
 * the change. If the audit insert fails, the change rolls back (ADR-061:
 * fail-closed for CRUD, unlike ADR-015's best-effort domain events).
 */
@Injectable()
export class AuditTrailSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<Row>): Promise<void> {
    await this.capture('create', event.metadata, event.manager, null, event.entity);
  }

  async afterUpdate(event: UpdateEvent<Row>): Promise<void> {
    const before = (event.databaseEntity as Row | undefined) ?? null;
    if (!before || !event.entity) return; // QueryBuilder update: no row context (banned by coverage spec)
    const after = { ...before, ...(event.entity as Row) };
    const updated = event.updatedColumns.map((c) => c.propertyName);
    await this.capture('update', event.metadata, event.manager, before, after, updated);
  }

  async afterSoftRemove(event: SoftRemoveEvent<Row>): Promise<void> {
    const row =
      (event.entity as Row | undefined) ?? (event.databaseEntity as Row | undefined) ?? null;
    await this.capture('delete', event.metadata, event.manager, row, row, [], event.entityId);
  }

  async afterRecover(event: RecoverEvent<Row>): Promise<void> {
    const row = (event.entity as Row | undefined) ?? null;
    await this.capture('restore', event.metadata, event.manager, null, row, [], event.entityId);
  }

  async afterRemove(event: RemoveEvent<Row>): Promise<void> {
    const row =
      (event.databaseEntity as Row | undefined) ?? (event.entity as Row | undefined) ?? null;
    await this.capture('purge', event.metadata, event.manager, row, null, [], event.entityId);
  }

  private async capture(
    kind: CaptureKind,
    metadata: EntityMetadata,
    manager: EntityManager,
    before: Row | null,
    after: Row | null,
    updatedColumns: string[] = [],
    explicitId?: unknown,
  ): Promise<void> {
    const options = auditableOptions(metadata.target);
    if (!options) return;

    const row = buildAuditRow({
      kind,
      options,
      entityId: this.idOf(metadata, after ?? before, explicitId),
      before,
      after,
      relations: new Set(metadata.relations.map((r) => r.propertyName)),
      columns: new Set(metadata.columns.map((c) => c.propertyName)),
      updatedColumns,
      store: auditContext.get(),
    });
    if (!row) return;

    await manager
      .createQueryBuilder()
      .insert()
      .into(AuditLog)
      .values(row as QueryDeepPartialEntity<AuditLog>)
      .callListeners(false)
      .execute();
  }

  private idOf(metadata: EntityMetadata, entity: Row | null, explicitId?: unknown): string | null {
    const primary = metadata.primaryColumns[0]?.propertyName;
    const fromEntity = primary && entity ? entity[primary] : undefined;
    const fromEvent =
      explicitId && typeof explicitId === 'object' && primary
        ? (explicitId as Row)[primary]
        : explicitId;
    const id = fromEntity ?? fromEvent;
    return typeof id === 'string' ? id : null;
  }
}
