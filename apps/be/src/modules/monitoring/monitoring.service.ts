import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import type { LifecycleState, LifecycleFlag } from './lib/presence-lifecycle';
import { LocationStaffRequirement } from '../location-staff-requirements/entities/location-staff-requirement.entity';
import { DayType } from '../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from './entities/user-tracking-status.entity';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryResponseDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import {
  StaffingSummaryResponseDto,
  StaffingSummaryItemDto,
  RoleStaffingDto,
  DayTypeRequirementsDto,
} from './dto/staffing-summary.dto';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringUserService } from './services/monitoring-user.service';
import { UserRole } from '../users/entities/user.entity';
import { STAFFING_COUNTED_ROLES } from '../users/constants/role-groups';
import { DayTypeService } from './services/day-type.service';
import { MonitoringCacheService } from './services/monitoring-cache.service';

// Snapshot DTOs for web frontend contract (apps/web/src/lib/api/monitoring-v2.ts)
export interface SnapshotWorker {
  user_id: string;
  full_name: string;
  role: string;
  lat: number;
  lng: number;
  status: TrackingStatus;
  location_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  last_update: string;
  is_within_area: boolean;
  battery_level: number | null;
  /** Attendance lifecycle (ADR-050). A live pin is always `bertugas`. */
  lifecycle_state: LifecycleState;
  /** Clocked in after start + grace. */
  is_late: boolean;
  /** Lifecycle flags: is_late | ad_hoc | lupa_clock_out | lembur | early | excused. */
  lifecycle_flags: LifecycleFlag[];
  /** True if this worker is on the current shift's roster (not ad-hoc). */
  is_scheduled: boolean;
  /** Team membership for grouping into team bubbles (ADR-048). team_id = schedule_event_id ?? team_category_id. */
  team_id: string | null;
  /** Team name (from team_category.name). */
  team_name: string | null;
  /** Marker color in hex format (from team_category.marker_color). */
  team_color: string | null;
}

export interface SnapshotAreaSummary {
  location_id: string;
  area_name: string;
  rayon_id: string;
  rayon_name: string;
  active_count: number;
  /** Total required staff summed across ALL roles (satgas + linmas) for the current shift + day type. */
  required_count: number;
  is_understaffed: boolean;
}

export interface SnapshotData {
  scope: string;
  scope_id: string | null;
  workers: SnapshotWorker[];
  area_summaries: SnapshotAreaSummary[];
  total_active: number;
  total_offline: number;
  total_absent: number;
  /** Axis, not a status — overlaps active/offline; never sum it into a headcount. */
  total_outside_area: number;
  // Roster-derived "expected vs actual" for today (ADR-013).
  expected_count: number;
  present_count: number;
  absent_count: number;
  on_leave_count: number;
  off_schedule_count: number;
  generated_at: string;
}

/**
 * Per-role tallies for one place. The three statuses partition the workforce;
 * `outside_area` is an independent axis that overlaps them (see
 * `getTrackingRoleCounts`), so the four fields do NOT sum to a headcount.
 */
type RoleStatusCounts = Record<TrackingStatus, number> & { outside_area: number };

const EMPTY_ROLE_STATUS_COUNTS: Readonly<RoleStatusCounts> = Object.freeze({
  active: 0,
  offline: 0,
  absent: 0,
  outside_area: 0,
});

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(LocationStaffRequirement)
    private readonly staffRequirementRepository: Repository<LocationStaffRequirement>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly statsService: MonitoringStatsService,
    private readonly userService: MonitoringUserService,
    private readonly dayTypeService: DayTypeService,
    @Optional()
    private readonly cacheService?: MonitoringCacheService,
  ) {}

  // ---- Delegated to MonitoringStatsService ----

  async getCityStats(): Promise<CityStatsDto> {
    return this.statsService.getCityStats();
  }

  async getRayonStats(rayonId: string): Promise<RayonStatsDto> {
    return this.statsService.getRayonStats(rayonId);
  }

  async getAreaStats(locationId: string): Promise<AreaStatsDto> {
    return this.statsService.getAreaStats(locationId);
  }

  // ---- Delegated to MonitoringUserService ----

  async getLiveUsers(filters?: LiveUsersFilterDto): Promise<LiveUsersResponseDto> {
    const result = await this.userService.getLiveUsers(filters);
    // Flag ad-hoc / off-schedule workers (clocked in but not on the current
    // shift's roster) so the map can style them distinctly.
    const currentShift = await this.statsService.getCurrentShiftDefinition();
    const scheduledIds = await this.statsService.scheduledUserIdsForCurrentShift(currentShift?.id);
    for (const u of result.users ?? []) {
      u.is_scheduled = scheduledIds.has(u.id);
    }
    return result;
  }

  async getLocationHistory(
    userId: string,
    date: string,
    shiftId?: string,
  ): Promise<LocationHistoryResponseDto> {
    return this.userService.getLocationHistory(userId, date, shiftId);
  }

  async getUserDaySummary(userId: string): Promise<UserDaySummaryDto> {
    return this.userService.getUserDaySummary(userId);
  }

  // ---- Phase 3: Unified snapshot endpoint ----

  /**
   * Returns a combined monitoring snapshot for a given scope.
   * Suitable for initial page load and periodic full-refresh polling.
   * Contract matches apps/web/src/lib/api/monitoring-v2.ts.
   */
  async getSnapshot(
    scope: 'city' | 'rayon' | 'area',
    id?: string,
  ): Promise<{
    success: boolean;
    data: SnapshotData;
  }> {
    const key = `snapshot:${scope}:${id ?? ''}`;
    if (typeof this.cacheService?.getOrCompute === 'function') {
      return this.cacheService.getOrCompute(key, () => this.computeSnapshot(scope, id));
    }
    return this.computeSnapshot(scope, id);
  }

  private async computeSnapshot(
    scope: 'city' | 'rayon' | 'area',
    id?: string,
  ): Promise<{ success: boolean; data: SnapshotData }> {
    const filters: LiveUsersFilterDto = {};
    if (scope === 'rayon' && id) filters.rayon_id = id;
    if (scope === 'area' && id) filters.location_id = id;

    const result = await this.userService.getLiveUsers(filters);
    const currentShift = await this.statsService.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    // Ad-hoc detection: workers NOT on the current shift's roster (e.g. patrol
    // workers clocked in without a schedule) are flagged so the map can style
    // them distinctly and the counts can exclude them.
    const scheduledIds = await this.statsService.scheduledUserIdsForCurrentShift(currentShift?.id);

    // Map LiveUserDto → SnapshotWorker (rename latitude/longitude → lat/lng, id → user_id)
    const workers: SnapshotWorker[] = (result?.users ?? []).map((u) => {
      const isScheduled = scheduledIds.has(u.id);
      // `ad_hoc` is decided here, where the roster check lives — the per-worker
      // lifecycle computed in getLiveUsers used a `scheduled: true` placeholder.
      // `?? []` guards partial payloads during rollout.
      const baseFlags = u.lifecycle_flags ?? [];
      const flags: LifecycleFlag[] = isScheduled ? baseFlags : [...baseFlags, 'ad_hoc'];
      return {
        user_id: u.id,
        full_name: u.full_name,
        role: u.role,
        lat: u.latitude,
        lng: u.longitude,
        status: u.status,
        location_id: u.location_id,
        area_name: u.area_name,
        rayon_id: u.rayon_id,
        rayon_name: u.rayon_name,
        last_update: u.last_update.toISOString(),
        is_within_area: u.is_within_area,
        battery_level: u.battery_level,
        lifecycle_state: u.lifecycle_state ?? 'bertugas',
        is_late: u.is_late ?? false,
        lifecycle_flags: flags,
        is_scheduled: isScheduled,
        team_id: u.team_id ?? null,
        team_name: u.team_name ?? null,
        team_color: u.team_color ?? null,
      };
    });

    // Build area_summaries from distinct areas present in workers
    const areaSummaries = await this.buildAreaSummaries(workers, currentShift, currentDayType);

    const generatedAt = new Date().toISOString();

    return {
      success: true,
      data: {
        scope,
        scope_id: id ?? null,
        workers,
        area_summaries: areaSummaries,
        total_active: result?.total_active ?? 0,
        total_offline: result?.total_offline ?? 0,
        total_absent: result?.total_absent ?? 0,
        total_outside_area: result?.total_outside_area ?? 0,
        expected_count: result?.expected_count ?? 0,
        present_count: result?.present_count ?? 0,
        absent_count: result?.absent_count ?? 0,
        on_leave_count: result?.on_leave_count ?? 0,
        off_schedule_count: result?.off_schedule_count ?? 0,
        generated_at: generatedAt,
      },
    };
  }

  /**
   * Build area_summaries by grouping workers by area and computing staffing.
   * For each distinct area: count active workers, get required_count from LocationStaffRequirement
   * for current shift + day type, compute is_understaffed.
   */
  private async buildAreaSummaries(
    workers: SnapshotWorker[],
    currentShift: ShiftDefinition | null,
    currentDayType: DayType,
  ): Promise<SnapshotAreaSummary[]> {
    // Group workers by location_id; track distinct areas with (id, name, rayon_id, rayon_name)
    const areaMap = new Map<
      string,
      { name: string; rayon_id: string; rayon_name: string; activeCount: number }
    >();

    for (const w of workers) {
      if (!w.location_id) continue; // Skip workers without area assignment
      // Only satgas+linmas staff a place (ADR-046). korlap / kepala_rayon /
      // admin_rayon are monitorable — they render on the map — but counting them
      // here let a supervisor standing in a park mask a real shortfall, since
      // `required_count` below sums satgas+linmas requirements only.
      if (!STAFFING_COUNTED_ROLES.includes(w.role as UserRole)) continue;

      const existing = areaMap.get(w.location_id);
      const activeCount = w.status === TrackingStatus.ACTIVE ? 1 : 0;

      if (existing) {
        existing.activeCount += activeCount;
      } else {
        areaMap.set(w.location_id, {
          name: w.area_name ?? 'Unknown',
          rayon_id: w.rayon_id ?? '',
          rayon_name: w.rayon_name ?? 'Unknown',
          activeCount,
        });
      }
    }

    // For each area, fetch required_count and build summary
    const summaries: SnapshotAreaSummary[] = [];

    for (const [locationId, areaData] of areaMap.entries()) {
      // Query required_count for this area + current shift + current day type
      // If no current shift, required_count defaults to 0 (understaffed = activeCount < 0 = false)
      let requiredCount = 0;

      if (currentShift) {
        // Requirements are per-role (satgas + linmas) — sum across ALL roles for
        // the shift/day-type, matching the staffing-summary path. findOne here
        // would return a single role and under-count the target.
        const reqs = await this.staffRequirementRepository.find({
          where: {
            location_id: locationId,
            shift_definition_id: currentShift.id,
            day_type: currentDayType,
          },
        });
        requiredCount = reqs.reduce((sum, r) => sum + r.required_count, 0);
      }

      summaries.push({
        location_id: locationId,
        area_name: areaData.name,
        rayon_id: areaData.rayon_id,
        rayon_name: areaData.rayon_name,
        active_count: areaData.activeCount,
        required_count: requiredCount,
        is_understaffed: areaData.activeCount < requiredCount,
      });
    }

    return summaries;
  }

  // ---- Staffing Summary (combines user & stats concerns, stays here) ----

  async getStaffingSummary(filters: {
    rayon_id?: string;
    location_id?: string;
  }): Promise<StaffingSummaryResponseDto> {
    const areas = await this.resolveAreas(filters);
    const currentShift = await this.statsService.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    const items: StaffingSummaryItemDto[] = [];

    for (const area of areas) {
      const item = await this.buildStaffingItem(area, currentShift, currentDayType);
      items.push(item);
    }

    return {
      items,
      current_day_type: currentDayType,
      current_day_type_label: this.dayTypeService.getDayTypeLabel(currentDayType),
      generated_at: new Date(),
    };
  }

  // ---- Private helpers ----

  private async resolveAreas(filters: {
    rayon_id?: string;
    location_id?: string;
  }): Promise<Location[]> {
    if (filters.location_id) {
      const area = await this.areaRepository.findOne({
        where: { id: filters.location_id, is_active: true },
      });
      return area ? [area] : [];
    }

    const where: Record<string, any> = { is_active: true };
    if (filters.rayon_id) where.rayon_id = filters.rayon_id;

    return this.areaRepository.find({ where });
  }

  private async buildStaffingItem(
    area: Location,
    currentShift: ShiftDefinition | null,
    currentDayType: DayType,
  ): Promise<StaffingSummaryItemDto> {
    const roleCounts = await this.getTrackingRoleCounts(area.id);

    const requirements = currentShift
      ? await this.staffRequirementRepository.find({
          where: {
            location_id: area.id,
            shift_definition_id: currentShift.id,
            day_type: currentDayType,
          },
        })
      : [];

    const allRequirements = currentShift
      ? await this.staffRequirementRepository.find({
          where: { location_id: area.id, shift_definition_id: currentShift.id },
        })
      : [];

    const reqMap = new Map(requirements.map((r) => [r.role, r.required_count]));
    const assignedCounts = await this.getAssignedRoleCounts(area.id);

    const requirementsByDayType = this.buildRequirementsByDayType(allRequirements);

    const roles: RoleStaffingDto[] = this.buildRoleStaffing(
      roleCounts,
      assignedCounts,
      reqMap,
      requirementsByDayType,
    );

    const totals = this.sumRoleTotals(roles);

    return {
      id: area.id,
      name: area.name,
      type: 'area',
      roles,
      ...totals,
      // active + offline = clocked in, which is what staffs a place; `outside_area`
      // is deliberately NOT added — it now OVERLAPS both statuses rather than being
      // a third one, so adding it would count anyone outside their boundary twice
      // and report a short-staffed park as fully staffed.
      is_fully_staffed: roles.every((r) => r.active + r.offline >= r.total_required),
    };
  }

  private buildRequirementsByDayType(
    allRequirements: LocationStaffRequirement[],
  ): Map<string, DayTypeRequirementsDto> {
    const map = new Map<string, DayTypeRequirementsDto>();

    for (const req of allRequirements) {
      const existing = map.get(req.role) ?? { weekday: 0, weekend: 0, holiday: 0 };

      switch (req.day_type) {
        case DayType.WEEKDAY:
          existing.weekday = req.required_count;
          break;
        case DayType.WEEKEND:
          existing.weekend = req.required_count;
          break;
        case DayType.HOLIDAY:
          existing.holiday = req.required_count;
          break;
      }

      map.set(req.role, existing);
    }

    return map;
  }

  private async getTrackingRoleCounts(locationId: string): Promise<Map<string, RoleStatusCounts>> {
    const rows = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('uts.status', 'status')
      .addSelect('uts.is_within_area', 'is_within_area')
      .addSelect('COUNT(*)', 'count')
      .where('uts.location_id = :locationId', { locationId })
      .groupBy('user.role')
      .addGroupBy('uts.status')
      .addGroupBy('uts.is_within_area')
      .getRawMany();

    // Inside/outside is an AXIS now, not a status, so it can no longer come from
    // the status column — it has to be grouped alongside it. `outside_area`
    // therefore OVERLAPS active/offline instead of partitioning them: a worker
    // outside their boundary is counted once under their status and again here.
    // Summing active+offline+absent+outside_area would double-count.
    const map = new Map<string, RoleStatusCounts>();
    for (const row of rows) {
      const existing = map.get(row.role) ?? { active: 0, offline: 0, absent: 0, outside_area: 0 };
      const count = parseInt(row.count, 10) || 0;
      if (row.status in existing) {
        existing[row.status as TrackingStatus] += count;
      }
      // Only a clocked-in worker has a meaningful location. ABSENT rows carry a
      // stale `is_within_area` from whenever they last reported, so counting
      // them here would report people who are at home as "outside their area".
      if (row.is_within_area === false && row.status !== TrackingStatus.ABSENT) {
        existing.outside_area += count;
      }
      map.set(row.role, existing);
    }
    return map;
  }

  private async getAssignedRoleCounts(locationId: string): Promise<Map<string, number>> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.location_id = :locationId', { locationId })
      .andWhere('user.deleted_at IS NULL')
      .groupBy('user.role')
      .getRawMany();

    return new Map(rows.map((r: any) => [r.role, parseInt(r.count)]));
  }

  private buildRoleStaffing(
    roleCounts: Map<string, RoleStatusCounts>,
    assignedCounts: Map<string, number>,
    reqMap: Map<string, number>,
    requirementsByDayType: Map<string, DayTypeRequirementsDto>,
  ): RoleStaffingDto[] {
    const allRoles = new Set([...roleCounts.keys(), ...assignedCounts.keys(), ...reqMap.keys()]);

    return Array.from(allRoles).map((role) => {
      const counts = roleCounts.get(role) ?? EMPTY_ROLE_STATUS_COUNTS;
      return {
        role,
        active: counts.active,
        offline: counts.offline,
        absent: counts.absent,
        outside_area: counts.outside_area,
        total_assigned: assignedCounts.get(role) || 0,
        total_required: reqMap.get(role) || 0,
        requirements_by_day_type: requirementsByDayType.get(role) ?? {
          weekday: 0,
          weekend: 0,
          holiday: 0,
        },
      };
    });
  }

  private sumRoleTotals(roles: RoleStaffingDto[]): {
    total_active: number;
    total_offline: number;
    total_absent: number;
    total_outside_area: number;
  } {
    return {
      total_active: roles.reduce((s, r) => s + r.active, 0),
      total_offline: roles.reduce((s, r) => s + r.offline, 0),
      total_absent: roles.reduce((s, r) => s + r.absent, 0),
      total_outside_area: roles.reduce((s, r) => s + r.outside_area, 0),
    };
  }
}
