import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PruningRequest } from '../entities/pruning-request.entity';

/**
 * Audit H1 (2026-05-23) — safe User-column projection for joined relations.
 *
 * Used by every path that hydrates `submitter` and `reviewer`. Limits the
 * relation rows to fields the UI actually renders, so we don't leak
 * `phone_number`, `kecamatan_id`, `is_active`, timestamps, etc. across role
 * boundaries. The QueryBuilder path in `findAll` mirrors this list via
 * explicit `addSelect([...])`.
 */
export const SAFE_PRUNING_REQUEST_SELECT = {
  submitter: {
    id: true,
    username: true,
    full_name: true,
    role: true,
    profile_picture_url: true,
  },
  reviewer: {
    id: true,
    username: true,
    full_name: true,
    role: true,
    profile_picture_url: true,
  },
} as const;

/**
 * Shared pruning-request lookup for the façade and workflow sub-service —
 * centralizes the load-or-404 pattern without a circular injection.
 */
@Injectable()
export class PruningRequestFinderService {
  private readonly logger = new Logger(PruningRequestFinderService.name);

  constructor(
    @InjectRepository(PruningRequest)
    private readonly pruningRequestRepository: Repository<PruningRequest>,
  ) {}

  /** Load a request without relations (write paths), or throw a 404. */
  async getOrFail(id: string): Promise<PruningRequest> {
    const request = await this.pruningRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }
    return request;
  }

  /** Load with submitter/reviewer/rayon hydrated via the safe projection, or 404. */
  async getWithPartiesOrFail(id: string): Promise<PruningRequest> {
    const request = await this.pruningRequestRepository.findOne({
      where: { id },
      relations: ['submitter', 'reviewer', 'rayon'],
      select: SAFE_PRUNING_REQUEST_SELECT,
    });
    if (!request) {
      this.logger.warn(`Pruning request ${id} not found`);
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }
    return request;
  }
}
