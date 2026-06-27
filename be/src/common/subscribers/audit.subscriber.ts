import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityMetadata,
  EntitySubscriberInterface,
  InsertEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { auditContext } from '../context/audit-context';

/**
 * Stamps actor-audit columns from the per-request audit context:
 *   created_by — on insert
 *   updated_by — on insert + update
 *   deleted_by — on soft remove
 *
 * Only touches entities that declare the column, so it's safe to register
 * globally. Requires soft deletes to go through `repository.softRemove(entity)`
 * (not the query-based `softDelete(id)`) for deleted_by to be captured.
 */
@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  private hasColumn(metadata: EntityMetadata, propertyName: string): boolean {
    return metadata.columns.some((c) => c.propertyName === propertyName);
  }

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const userId = auditContext.getUserId();
    if (!userId || !event.entity) return;
    if (this.hasColumn(event.metadata, 'created_by') && event.entity.created_by == null) {
      event.entity.created_by = userId;
    }
    if (this.hasColumn(event.metadata, 'updated_by')) {
      event.entity.updated_by = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<Record<string, unknown>>): void {
    const userId = auditContext.getUserId();
    if (!userId || !event.entity) return;
    if (this.hasColumn(event.metadata, 'updated_by')) {
      event.entity.updated_by = userId;
    }
  }

  beforeSoftRemove(event: SoftRemoveEvent<Record<string, unknown>>): void {
    const userId = auditContext.getUserId();
    if (!userId || !event.entity) return;
    if (this.hasColumn(event.metadata, 'deleted_by')) {
      event.entity.deleted_by = userId;
    }
  }
}
