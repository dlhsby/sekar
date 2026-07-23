import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DisplayScope, deeperDisplayScope } from '../../common/enums/assignment-scope.enum';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import type { LifecycleState, LifecycleFlag } from './lib/presence-lifecycle';
import { LocationStaffRequirement } from '../location-staff-requirements/entities/location-staff-requirement.entity';
import { DayType } from '../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from './entities/user-tracking-status.entity';
import { CityStatsDto } from './dto/city-stats.dto';
import { DistrictStatsDto } from './dto/district-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryResponseDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import { TimezoneUtil } from '../../common/utils/timezone.util';
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
  /** The role's configured marker icon (null → client uses the role default glyph). */
  role_marker_icon: string | null;
  lat: number;
  lng: number;
  status: TrackingStatus;
  location_id: string | null;
  location_name: string | null;
  district_id: string | null;
  district_name: string | null;
  region_id: string | null;
  region_name: string | null;
  /**
   * The drill level this worker belongs to — the SCOPE of their current-shift
   * schedule (`location` if rostered to a lokasi, `region` a kawasan, `district` a
   * district, `city` if city-wide / unassigned). Ad-hoc (unscheduled) workers fall
   * back to their live position's deepest scope. The web shows a worker only at
   * the matching drill level (a lokasi-scheduled worker never appears at city).
   */
  display_scope: 'city' | 'district' | 'region' | 'location';
  /** The id of the scope entity (district/region/location); null at city scope. */
  display_scope_id: string | null;
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
  /** Marker glyph name (from team_category.marker_icon). */
  team_icon: string | null;
}

export interface SnapshotAreaSummary {
  location_id: string;
  location_name: string;
  district_id: string;
  district_name: string;
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

  async getDistrictStats(districtId: string): Promise<DistrictStatsDto> {
    return this.statsService.getDistrictStats(districtId);
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
    scope: 'city' | 'district' | 'location',
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
    scope: 'city' | 'district' | 'location',
    id?: string,
  ): Promise<{ success: boolean; data: SnapshotData }> {
    const filters: LiveUsersFilterDto = {};
    if (scope === 'district' && id) filters.district_id = id;
    if (scope === 'location' && id) filters.location_id = id;

    const result = await this.userService.getLiveUsers(filters);
    const currentShift = await this.statsService.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    // Ad-hoc detection: workers NOT on the current shift's roster (e.g. patrol
    // workers clocked in without a schedule) are flagged so the map can style
    // them distinctly and the counts can exclude them.
    const scheduledIds = await this.statsService.scheduledUserIdsForCurrentShift(currentShift?.id);
    // Each worker's drill level = the SCOPE of their current-shift schedule, so a
    // lokasi-scheduled worker shows only at that lokasi, a district-scheduled worker
    // only at that district, and a city-wide/unassigned worker only at the city view.
    const scheduleScopes = await this.statsService.scheduleScopesForCurrentShift(currentShift?.id);
    // A worker who has STARTED a task is monitored wherever that task is scoped,
    // extending (or, for the unscheduled, providing) their map placement (ADR-046).
    const taskScopes = await this.statsService.inProgressTaskScopesForUsers(
      (result?.users ?? []).map((u) => u.id),
    );

    // Map LiveUserDto → SnapshotWorker (rename latitude/longitude → lat/lng, id → user_id)
    const workers: SnapshotWorker[] = (result?.users ?? []).map((u) => {
      const isScheduled = scheduledIds.has(u.id);
      // Display scope: the schedule scope when rostered. An ad-hoc clock-in (no
      // occurrence on the current shift) is placed flat at CITY scope and rendered
      // as a distinct "Luar Jadwal" marker there — a deliberate simplification
      // (was: fall back to the deepest static assignment). This keeps unscheduled
      // workers easy to identify and avoids scattering them across tiers where
      // their static assignment may not reflect where they actually are.
      const sched = scheduleScopes.get(u.id);
      const task = taskScopes.get(u.id);
      // Deepest-wins across the schedule occurrence and any in-progress task; a
      // worker with neither is an ad-hoc clock-in placed flat at city scope.
      const candidates = [sched, task].filter((c): c is DisplayScope => Boolean(c));
      const display: DisplayScope =
        candidates.length === 0
          ? { scope: 'city', scope_id: null }
          : candidates.reduce(deeperDisplayScope);
      // `ad_hoc` is decided here, where the roster check lives — the per-worker
      // lifecycle computed in getLiveUsers used a `scheduled: true` placeholder.
      // `?? []` guards partial payloads during rollout.
      const baseFlags = u.lifecycle_flags ?? [];
      const flags: LifecycleFlag[] = isScheduled ? baseFlags : [...baseFlags, 'ad_hoc'];
      return {
        user_id: u.id,
        full_name: u.full_name,
        role: u.role,
        role_marker_icon: u.role_marker_icon ?? null,
        lat: u.latitude,
        lng: u.longitude,
        status: u.status,
        location_id: u.location_id,
        location_name: u.location_name,
        district_id: u.district_id,
        district_name: u.district_name,
        region_id: u.region_id,
        region_name: u.region_name,
        display_scope: display.scope,
        display_scope_id: display.scope_id,
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
        team_icon: u.team_icon ?? null,
      };
    });

    // Build area_summaries from distinct areas present in workers
    const areaSummaries = await this.buildAreaSummaries(
      workers,
      currentShift,
      currentDayType,
      scope,
      id,
    );

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
        // "Luar jadwal" = clocked in but NOT on the CURRENT shift's roster — the
        // same current-shift definition used per-worker (`is_scheduled`) above and
        // by the aggregate, so the status bar and the worker list always agree.
        // (getLiveUsers' looser "no schedule today at all" count is not used here.)
        off_schedule_count: workers.filter((w) => !w.is_scheduled).length,
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
    scope: 'city' | 'district' | 'location',
    scopeId?: string,
  ): Promise<SnapshotAreaSummary[]> {
    // Group workers by location_id; track distinct areas with (id, name, district_id, district_name)
    const areaMap = new Map<
      string,
      { name: string; district_id: string; district_name: string; activeCount: number }
    >();

    // Which lokasi each worker is ROSTERED to this shift. Staffing is
    // `assigned ∧ present` (ADR-053), not `standing here right now`: a satgas
    // covering A, B and X staffs all three while on duty. Falls back to their
    // live lokasi for an ad-hoc worker with no roster row.
    const assignedByUser = await this.statsService.scheduledLocationIdsByUser(
      TimezoneUtil.jakartaDateString(),
      currentShift?.id,
    );

    // Only workers who can actually staff a place contribute. Only satgas+linmas
    // staff one (ADR-046): counting a korlap standing in a park let a supervisor
    // mask a real shortfall, since `required_count` below sums satgas+linmas
    // requirements only. Ad-hoc clock-ins never count either (ADR-050 5.4d), and
    // the aggregate path excludes them too — keep the two in lock-step.
    //
    // Consequence (intended): a lokasi whose ONLY clocked-in workers are ad-hoc
    // produces NO area_summary — exactly like a lokasi with no workers at all.
    // area_summaries is a present-worker rollup, never a complete lokasi list;
    // understaffing of unmanned/ad-hoc-only lokasi is surfaced by the AGGREGATE
    // (which walks every lokasi with a requirement), the authoritative coverage view.
    const contributors = workers.filter(
      (w) => STAFFING_COUNTED_ROLES.includes(w.role as UserRole) && w.is_scheduled,
    );

    // Every lokasi that could appear in the output. A rostered worker is credited
    // to their ROSTER, which is known independently of GPS — so a satgas walking
    // the road between two taman (`location_id === null`) still staffs both,
    // instead of dropping out and reporting each one short.
    const candidateIds = new Set<string>();
    for (const w of contributors) {
      const credited = assignedByUser.get(w.user_id) ?? (w.location_id ? [w.location_id] : []);
      for (const locationId of credited) candidateIds.add(locationId);
    }

    // Authoritative metadata, straight from the lokasi rows. Deriving it from
    // whichever worker happened to be standing there named a credited lokasi
    // after a DIFFERENT one (a worker rostered to A and B, standing in A, made B
    // report A's name and rayon) and made the result depend on worker ordering.
    // This lookup doubles as the scope + is_active gate: a lokasi outside the
    // requested scope, or deactivated, is simply absent from `areaMeta` and is
    // therefore never credited — a district-scoped snapshot can no longer leak a
    // lokasi from another rayon via a worker rostered across both.
    const areaMeta = new Map<
      string,
      { name: string; district_id: string; district_name: string }
    >();
    if (candidateIds.size > 0) {
      const scopeWhere: Record<string, unknown> = {
        id: In([...candidateIds]),
        is_active: true,
      };
      if (scope === 'district' && scopeId) scopeWhere.district_id = scopeId;
      if (scope === 'location' && scopeId) scopeWhere.id = scopeId;
      const locations = await this.areaRepository.find({
        where: scopeWhere,
        relations: ['district'],
      });
      for (const loc of locations) {
        areaMeta.set(loc.id, {
          name: loc.name,
          district_id: loc.district_id ?? '',
          district_name: loc.district?.name ?? 'Unknown',
        });
      }
    }

    for (const w of contributors) {
      // Staffing counts whoever CLOCKED IN — active + offline — matching the
      // aggregate (`assembleNode`/`countableOnlineByGroup`) and the model: a park
      // is no less staffed because a phone lost GPS. Counting ACTIVE only reported
      // a fully-present park as understaffed the moment signals went stale.
      const clockedIn =
        w.status === TrackingStatus.ACTIVE || w.status === TrackingStatus.OFFLINE ? 1 : 0;

      // Credit EVERY lokasi this worker is rostered to, not just the one their
      // GPS lands in. One worker still counts once per lokasi, and never twice
      // in the same one.
      const credited = assignedByUser.get(w.user_id) ?? (w.location_id ? [w.location_id] : []);
      for (const locationId of credited) {
        const meta = areaMeta.get(locationId);
        if (!meta) continue; // out of scope, deactivated, or deleted
        const existing = areaMap.get(locationId);
        if (existing) {
          existing.activeCount += clockedIn;
        } else {
          areaMap.set(locationId, { ...meta, activeCount: clockedIn });
        }
      }
    }

    // Batch the requirement lookup for every area in ONE query (was a per-area
    // find → N+1: a 100-area city snapshot fired 100 queries). Requirements are
    // per-role (satgas + linmas); sum across roles per location. Stays
    // location-keyed on purpose — a lokasi under a kawasan-scoped district has no
    // location-tier target (the kawasan owns it), matching the aggregate.
    const requiredByLocation = new Map<string, number>();
    if (currentShift && areaMap.size > 0) {
      const reqs = await this.staffRequirementRepository.find({
        where: {
          location_id: In([...areaMap.keys()]),
          shift_definition_id: currentShift.id,
          day_type: currentDayType,
        },
      });
      for (const r of reqs) {
        if (!r.location_id) continue;
        requiredByLocation.set(
          r.location_id,
          (requiredByLocation.get(r.location_id) ?? 0) + r.required_count,
        );
      }
    }

    const summaries: SnapshotAreaSummary[] = [];
    for (const [locationId, areaData] of areaMap.entries()) {
      const requiredCount = requiredByLocation.get(locationId) ?? 0;
      summaries.push({
        location_id: locationId,
        location_name: areaData.name,
        district_id: areaData.district_id,
        district_name: areaData.district_name,
        active_count: areaData.activeCount,
        required_count: requiredCount,
        is_understaffed: areaData.activeCount < requiredCount,
      });
    }

    return summaries;
  }

  // ---- Staffing Summary (combines user & stats concerns, stays here) ----

  async getStaffingSummary(filters: {
    district_id?: string;
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
    district_id?: string;
    location_id?: string;
  }): Promise<Location[]> {
    if (filters.location_id) {
      const area = await this.areaRepository.findOne({
        where: { id: filters.location_id, is_active: true },
      });
      return area ? [area] : [];
    }

    const where: Record<string, any> = { is_active: true };
    if (filters.district_id) where.district_id = filters.district_id;

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
      type: 'location',
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
