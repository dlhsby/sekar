import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import {
  AssignmentScope,
  ASSIGNMENT_SCOPE_RANK,
  NO_SCOPE,
  ResolvedScope,
} from '../../../common/enums/assignment-scope.enum';

/**
 * Resolves a user's deepest schedule scope on a day, so tasks/activities can
 * "follow the schedule assigned" (ADR-046). Write-side sibling of
 * MonitoringStatsService.scheduleScopesForCurrentShift.
 */
@Injectable()
export class ScheduleScopeResolverService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  /**
   * Resolve the scope of `userId`'s schedule on `date` (Jakarta `YYYY-MM-DD`).
   * Optionally narrow to a single shift definition (e.g. the worker's active shift).
   * Returns {@link NO_SCOPE} when there is no planned/present occurrence.
   */
  async resolveForUserOnDate(
    userId: string,
    date: string,
    shiftDefinitionId?: string | null,
  ): Promise<ResolvedScope> {
    if (!userId || !date) return NO_SCOPE;

    const qb = this.scheduleRepository
      .createQueryBuilder('s')
      .select('s.district_id', 'district_id')
      .addSelect('s.region_id', 'region_id')
      .addSelect('s.location_id', 'location_id')
      .where('s.user_id = :userId', { userId })
      .andWhere('s.schedule_date = :date', { date })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .andWhere('s.deleted_at IS NULL');

    if (shiftDefinitionId) {
      qb.andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId });
    }

    const rows = (await qb.getRawMany()) as Array<{
      district_id: string | null;
      region_id: string | null;
      location_id: string | null;
    }>;

    let best: ResolvedScope = NO_SCOPE;
    for (const r of rows) {
      const resolved: ResolvedScope = r.location_id
        ? {
            scope: AssignmentScope.LOCATION,
            district_id: r.district_id,
            region_id: r.region_id,
            location_id: r.location_id,
          }
        : r.region_id
          ? {
              scope: AssignmentScope.REGION,
              district_id: r.district_id,
              region_id: r.region_id,
              location_id: null,
            }
          : r.district_id
            ? {
                scope: AssignmentScope.DISTRICT,
                district_id: r.district_id,
                region_id: null,
                location_id: null,
              }
            : {
                scope: AssignmentScope.CITY,
                district_id: null,
                region_id: null,
                location_id: null,
              };
      if (ASSIGNMENT_SCOPE_RANK[resolved.scope] > ASSIGNMENT_SCOPE_RANK[best.scope]) {
        best = resolved;
      }
    }
    return best;
  }
}
