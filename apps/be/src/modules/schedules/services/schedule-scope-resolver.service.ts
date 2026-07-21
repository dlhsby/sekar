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
 * ScheduleScopeResolverService — turns a user's schedule occurrence(s) on a given
 * day into a single {@link ResolvedScope} (the tier + ids), so tasks and activities
 * can "follow the schedule assigned" (user-directed, ADR-046).
 *
 * The scope of one occurrence is its deepest bound level: a `schedule_locations`
 * row → `location`, else `region_id` → `region`, else `district_id` → `district`,
 * else `city`. When a user has several occurrences that day we keep the DEEPEST one
 * (a lokasi placement is more specific than a district one). No occurrence → `none`,
 * so an unscheduled worker is never blocked — the caller decides the fallback.
 *
 * This is the write-side sibling of MonitoringStatsService.scheduleScopesForCurrentShift
 * (which powers live map placement); both derive scope from the same occurrence shape.
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
      .leftJoin('schedule_locations', 'sl', 'sl.schedule_id = s.id')
      .select('s.district_id', 'district_id')
      .addSelect('s.region_id', 'region_id')
      .addSelect('sl.location_id', 'location_id')
      .addSelect('sl.id', 'sl_id')
      .where('s.user_id = :userId', { userId })
      .andWhere('s.schedule_date = :date', { date })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('sl.id', 'ASC');

    if (shiftDefinitionId) {
      qb.andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId });
    }

    const rows = (await qb.getRawMany()) as Array<{
      district_id: string | null;
      region_id: string | null;
      location_id: string | null;
      sl_id: string | null;
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
