import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    entity_type: string;
    entity_id: string;
    action: string;
    actor_id: string;
    old_value?: Record<string, any> | null;
    new_value?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
  }): Promise<AuditLog> {
    const entry = this.auditLogRepo.create({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      action: params.action,
      actor_id: params.actor_id,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      metadata: params.metadata ?? null,
    });

    const saved = await this.auditLogRepo.save(entry);
    this.logger.debug(
      `Audit: ${params.entity_type}/${params.entity_id} ${params.action} by ${params.actor_id}`,
    );
    return saved;
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entity_type: entityType, entity_id: entityId },
      relations: ['actor'],
      order: { created_at: 'DESC' },
    });
  }

  async getActorHistory(actorId: string): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { actor_id: actorId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async findAllPaginated(filters: AuditFilterDto): Promise<PaginatedResponseDto<AuditLog>> {
    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor');

    if (filters.entity_type) {
      qb.andWhere('audit.entity_type = :entityType', { entityType: filters.entity_type });
    }
    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.actor_id) {
      qb.andWhere('audit.actor_id = :actorId', { actorId: filters.actor_id });
    }
    if (filters.from_date) {
      qb.andWhere('audit.created_at >= :fromDate', { fromDate: filters.from_date });
    }
    if (filters.to_date) {
      qb.andWhere('audit.created_at <= :toDate', { toDate: filters.to_date });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    qb.orderBy('audit.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }
}
