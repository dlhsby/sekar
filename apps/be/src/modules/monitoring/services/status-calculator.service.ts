import { Injectable, Logger, forwardRef, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserTrackingStatus,
  TrackingStatus,
  ActivityStatus,
  LocationStatus,
} from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { EventsGateway } from '../../../gateways/events.gateway';
import {
  UserStatusChangedEvent,
  UserAreaEvent,
  UserLocationEvent,
  AreaStaffingChangedEvent,
} from '../../../gateways/dto/events.dto';
import { LocationStaffRequirement } from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { StaffingDebouncerService } from './staffing-debouncer.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';
import { BoundaryCheckService } from '../../../shared/services/boundary-check.service';
import { UserLocationsService } from '../../user-locations/user-locations.service';
import { SchedulesService } from '../../schedules/schedules.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';

export interface StatusInput {
  hasActiveShift: boolean;
  lastLocationAt: Date | null;
  isWithinArea: boolean;
}

@Injectable()
export class StatusCalculatorService {
  private readonly logger = new Logger(StatusCalculatorService.name);

  constructor(
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(LocationStaffRequirement)
    private readonly staffRequirementRepository: Repository<LocationStaffRequirement>,
    private readonly cacheService: MonitoringCacheService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    @Optional()
    private readonly staffingDebouncer: StaffingDebouncerService | undefined,
    // Phase 4-3 (M2): missing-worker alert. Optional so legacy tests that don't
    // wire NotificationsService keep working.
    @Optional()
    private readonly notificationsService?: NotificationsService,
    // Phase 4-3 (§C1 #8 hardening): cross-path dedup so the every-minute
    // scheduler and the 5-min stale-status sweeper don't both alert for the
    // same worker. Optional → fails open (sends) when Redis is absent.
    @Optional()
    private readonly redisService?: RedisService,
    // Phase 4-7 (H1): polygon/tolerance math extracted to the shared service.
    // Optional → legacy specs without the provider fall back to a local instance.
    @Optional()
    private readonly boundaryCheckService?: BoundaryCheckService,
    // ADR-013 §5: a worker on an accepted cross-area task should count as
    // within-area while inside that task's area. Optional → legacy specs
    // without the provider fall back to primary-area-only checking.
    @Optional()
    private readonly userAreasService?: UserLocationsService,
    // Monitoring/geofencing/tracking read the day's GENERATED roster, not the
    // raw user assignment (the user record is only the template that feeds
    // generation). Optional → legacy specs fall back to user_areas.
    @Optional()
    private readonly dailySchedulesService?: SchedulesService,
  ) {}

  private get boundaryCheck(): BoundaryCheckService {
    return (this.boundaryCheckFallback ??= this.boundaryCheckService ?? new BoundaryCheckService());
  }
  private boundaryCheckFallback?: BoundaryCheckService;

  /**
   * Phase 4-3 (§C1 #8): notify the korlap(s) responsible for an area AND the
   * kepala_rayon of its rayon when one of their workers transitions to MISSING.
   *
   * Public so the 5-min stale-status sweeper can reuse it for the records it
   * flips directly (those bypass `recalculate`). De-duplicated per
   * (worker, Jakarta-day) so the sweeper + scheduler can't double-alert and a
   * flapping worker isn't spammed; the dedup fails OPEN — a Redis hiccup must
   * never silence a safety alert.
   *
   * Korlap scope matches the worker's primary `users.location_id` (multi-area via
   * `user_areas` is a later follow-up); kepala_rayon scope matches `rayon_id`.
   */
  async notifyMissingWorker(
    workerUserId: string,
    locationId: string | null,
    rayonId?: string | null,
  ): Promise<void> {
    if (!this.notificationsService || !locationId) return;

    // Cross-path dedup: claim once per worker per Jakarta day.
    const claimed = await this.claimMissingAlert(workerUserId);
    if (!claimed) return;

    try {
      const worker = await this.userRepository.findOne({
        where: { id: workerUserId },
        select: ['id', 'full_name'],
      });
      const workerName = worker?.full_name ?? 'pekerja';

      const korlaps = await this.userRepository.find({
        where: { role: UserRole.KORLAP, location_id: locationId, is_active: true },
        select: ['id'],
      });

      const kepalaRayons = rayonId
        ? await this.userRepository.find({
            where: { role: UserRole.KEPALA_RAYON, rayon_id: rayonId, is_active: true },
            select: ['id'],
          })
        : [];

      // Dedup recipient ids (a user could match both queries in odd configs).
      const recipientIds = Array.from(new Set([...korlaps, ...kepalaRayons].map((u) => u.id)));

      await Promise.all(
        recipientIds.map((id) =>
          this.notificationsService!.sendToUser({
            user_id: id,
            title: 'Pekerja hilang',
            body: `${workerName} terdeteksi MISSING di area Anda. Mohon segera periksa.`,
            type: NotificationType.MISSING_WORKER_ALERT,
            data: { worker_user_id: workerUserId, location_id: locationId },
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `notifyMissingWorker failed for worker ${workerUserId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Claim the once-per-day missing-worker alert slot for a worker via Redis
   * `SET key 1 NX EX 86400`. Returns true when the alert should be sent.
   * Fails OPEN: no Redis or a Redis error returns true so the safety alert is
   * never suppressed by infrastructure trouble.
   */
  private async claimMissingAlert(workerUserId: string): Promise<boolean> {
    if (!this.redisService) return true;
    try {
      // Jakarta day bucket (+7, no DST) so the key rolls at local midnight.
      const dayStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await this.redisService
        .getClient()
        .set(`missing-alert:${workerUserId}:${dayStr}`, '1', 'EX', 86_400, 'NX');
      return res === 'OK';
    } catch (err) {
      this.logger.warn(
        `missing-alert dedup claim failed for ${workerUserId}: ${(err as Error).message}`,
      );
      return true;
    }
  }

  /**
   * Three states, one threshold (ADR-046 amendment):
   *   not clocked in            → ABSENT   (*tidak hadir* when a schedule exists)
   *   clocked in, fresh fix     → ACTIVE
   *   clocked in, stale/no fix  → OFFLINE
   *
   * Inside/outside the area is **not** decided here — `is_within_area` carries it
   * as an independent axis, so a worker can be ACTIVE and outside. The old
   * `OUTSIDE_AREA` status conflated the two, which meant a worker outside their
   * area had no reportable activity state at all.
   *
   * Only `active_max_age_seconds` matters now: `idle` folded into OFFLINE, so
   * everything past the first boundary is offline and the old `inactive`/`missing`
   * thresholds became unreachable (they are retired from the settings catalog).
   */
  calculateStatus(
    input: StatusInput,
    thresholds: StatusThresholds,
    now: Date = new Date(),
  ): TrackingStatus {
    if (!input.hasActiveShift) {
      return TrackingStatus.ABSENT;
    }

    if (!input.lastLocationAt) {
      return TrackingStatus.OFFLINE;
    }

    const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;
    return ageSeconds <= thresholds.active_max_age_seconds
      ? TrackingStatus.ACTIVE
      : TrackingStatus.OFFLINE;
  }

  calculateAxes(
    input: StatusInput,
    thresholds: StatusThresholds,
    now: Date = new Date(),
  ): { activity: ActivityStatus; location: LocationStatus } {
    let activity: ActivityStatus;
    if (!input.hasActiveShift) {
      activity = 'absent';
    } else if (!input.lastLocationAt) {
      activity = 'offline';
    } else {
      const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;
      activity = ageSeconds <= thresholds.active_max_age_seconds ? 'aktif' : 'offline';
    }

    // Inside/outside is reported for BOTH aktif and offline — an offline worker's
    // last known fix is exactly what a supervisor needs ("unreachable, and the last
    // we saw they were outside their park"). Throwing it away would make offline
    // indistinguishable from absent on the one axis that still carries information.
    //
    // 'unknown' is reserved for the two cases with genuinely nothing to report:
    // never clocked in, or clocked in and no fix has EVER arrived.
    const location: LocationStatus =
      activity === 'absent' || !input.lastLocationAt
        ? 'unknown'
        : input.isWithinArea
          ? 'dalam_area'
          : 'luar_area';

    return { activity, location };
  }

  async recalculate(userId: string): Promise<UserTrackingStatus | null> {
    const existing = await this.trackingRepository.findOne({
      where: { user_id: userId },
    });

    if (!existing) {
      return null;
    }

    const thresholds = await this.cacheService.getThresholds();
    const now = new Date();
    const previousStatus = existing.status;

    const newStatus = this.calculateStatus(
      {
        hasActiveShift: !!existing.shift_id,
        lastLocationAt: existing.last_location_at,
        isWithinArea: existing.is_within_area,
      },
      thresholds,
      now,
    );

    if (newStatus !== previousStatus) {
      existing.status = newStatus;
      existing.updated_at = now;
      await this.trackingRepository.save(existing);

      await this.broadcastStatusChanged(existing, previousStatus, newStatus, now);
      await this.emitStaffingChangedIfNeeded(existing.location_id, previousStatus, newStatus, now);

      // Phase 4-3 (M2): alert korlap + kepala_rayon when a clocked-in worker goes
      // unreachable. Fire-and-forget; never block the status calculation on dispatch.
      //
      // The alert rides OFFLINE (was MISSING). With `active_max_age_sec` now 10 min
      // (ADR-050) it fires after 10 min of silence, and `notifyMissingWorker`
      // de-dupes to once per worker per Jakarta day, so patchy signal can't spam a
      // korlap. Suppressing the page once a worker is past his shift end (an
      // expected departure) is a lifecycle-phase refinement — it needs the resolved
      // shift window, which this path does not yet carry.
      if (newStatus === TrackingStatus.OFFLINE && previousStatus !== TrackingStatus.OFFLINE) {
        void this.notifyMissingWorker(userId, existing.location_id, existing.rayon_id);
      }

      this.logger.debug(`User ${userId} status: ${previousStatus} → ${newStatus}`);
    }

    return existing;
  }

  async onClockIn(
    userId: string,
    shiftId: string,
    locationId: string | null,
    shiftDefinitionId: string | null,
    clockInLat?: number,
    clockInLng?: number,
  ): Promise<void> {
    const now = new Date();

    let isWithinArea = true;
    if (locationId && clockInLat !== undefined && clockInLng !== undefined) {
      isWithinArea = await this.checkWithinArea(locationId, clockInLat, clockInLng);
    }

    // Resolve rayon_id from the day's generated roster first (the operational
    // source of truth), then the area's rayon, then the user template last.
    let rayonId: string | null = null;
    const roster = this.dailySchedulesService
      ? await this.dailySchedulesService.findByUserAndDate(userId, TimezoneUtil.jakartaDateString())
      : null;
    if (roster?.rayon_id) {
      rayonId = roster.rayon_id;
    } else if (locationId) {
      const area = await this.areaRepository.findOne({
        where: { id: locationId },
        select: ['id', 'rayon_id'],
      });
      rayonId = area?.rayon_id || null;
    }
    if (!rayonId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'rayon_id'],
      });
      rayonId = user?.rayon_id ?? null;
    }

    await this.trackingRepository.upsert(
      {
        user_id: userId,
        shift_id: shiftId,
        shift_definition_id: shiftDefinitionId,
        location_id: locationId,
        rayon_id: rayonId,
        status: TrackingStatus.ACTIVE,
        is_within_area: isWithinArea,
        updated_at: now,
      },
      ['user_id'],
    );

    this.logger.log(`User ${userId} clocked in → ACTIVE (within_area: ${isWithinArea})`);
  }

  async onClockOut(userId: string): Promise<void> {
    const now = new Date();

    await this.trackingRepository.upsert(
      {
        user_id: userId,
        shift_id: null,
        shift_definition_id: null,
        location_id: null,
        rayon_id: null,
        // Not clocked in is ABSENT, not OFFLINE. Under the 5→3 collapse OFFLINE
        // inverted to mean "clocked in but unreachable"; a clocked-out worker is
        // simply not on shift, which is exactly what calculateStatus returns for
        // !hasActiveShift. Writing OFFLINE here contradicted the calculator and
        // read as "unreachable" in any query that isn't gated on shift_id.
        status: TrackingStatus.ABSENT,
        is_within_area: true,
        updated_at: now,
      },
      ['user_id'],
    );

    this.logger.log(`User ${userId} clocked out → ABSENT`);
  }

  async onLocationPing(
    userId: string,
    lat: number,
    lng: number,
    accuracy: number | null,
    battery: number | null,
    loggedAt: Date,
  ): Promise<void> {
    // Audit M6 (2026-05-23): eager-load `user` + `area` alongside the
    // tracking row so the broadcast helpers don't have to re-query for
    // context. Cuts the per-ping DB cost from ~3 reads (tracking + user
    // + area) to 1. Column projection mirrors `resolveUserContext`'s
    // select-list so we don't pull `password_hash`, etc.
    const existing = await this.trackingRepository.findOne({
      where: { user_id: userId },
      relations: ['shift_definition', 'user', 'area'],
      select: {
        user: { id: true, full_name: true, role: true },
        area: { id: true, name: true, rayon_id: true },
      } as any,
    });

    if (!existing || !existing.shift_id) {
      return;
    }

    const previousWithinArea = existing.is_within_area;
    const now = new Date();

    let isWithinArea = true;
    if (existing.location_id) {
      isWithinArea = await this.checkWithinAnyAssignedArea(userId, existing.location_id, lat, lng);
    }

    const thresholds = await this.cacheService.getThresholds();
    const previousStatus = existing.status;

    const newStatus = this.calculateStatus(
      {
        hasActiveShift: true,
        lastLocationAt: loggedAt,
        isWithinArea,
      },
      thresholds,
      now,
    );

    existing.last_latitude = lat;
    existing.last_longitude = lng;
    existing.last_accuracy_meters = accuracy;
    existing.last_battery_level = battery;
    existing.last_location_at = loggedAt;
    existing.is_within_area = isWithinArea;
    existing.status = newStatus;
    existing.updated_at = now;

    await this.trackingRepository.save(existing);

    // Audit M6: prefer the eager-loaded relations from the initial findOne.
    // Fall back to `resolveUserContext` only when the join produced nothing
    // (e.g. user row vanished between fetch and broadcast — unlikely but
    // defensive) so we keep parity with the previous behaviour.
    const context = existing.user
      ? { user: existing.user, area: existing.area ?? null }
      : await this.resolveUserContext(existing.user_id, existing.location_id);

    // Broadcast boundary crossing events via WebSocket
    if (previousWithinArea && !isWithinArea) {
      await this.broadcastAreaEvent('left', existing, lat, lng, now, context);
    } else if (!previousWithinArea && isWithinArea) {
      await this.broadcastAreaEvent('entered', existing, lat, lng, now, context);
    }

    // Broadcast status change via WebSocket if changed
    if (newStatus !== previousStatus) {
      await this.broadcastStatusChanged(existing, previousStatus, newStatus, now, context);
      await this.emitStaffingChangedIfNeeded(existing.location_id, previousStatus, newStatus, now);
    }

    // Always emit location update
    await this.broadcastLocationUpdate(
      existing,
      lat,
      lng,
      accuracy,
      battery,
      newStatus,
      isWithinArea,
      now,
      context,
    );
  }

  // ---- Private broadcast helpers ----

  private async broadcastStatusChanged(
    tracking: UserTrackingStatus,
    previousStatus: TrackingStatus,
    newStatus: TrackingStatus,
    timestamp: Date,
    preResolved?: { user: User; area: Location | null } | null,
  ): Promise<void> {
    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.location_id));
    if (!context) return;

    const thresholds = await this.cacheService.getThresholds();
    const axes = this.calculateAxes(
      {
        hasActiveShift: !!tracking.shift_id,
        lastLocationAt: tracking.last_location_at,
        isWithinArea: tracking.is_within_area,
      },
      thresholds,
      timestamp,
    );

    const event: UserStatusChangedEvent = {
      user_id: tracking.user_id,
      user_name: context.user.full_name,
      role: context.user.role as UserRole,
      location_id: tracking.location_id,
      area_name: context.area?.name || null,
      rayon_id: context.area?.rayon_id || null,
      previous_status: previousStatus,
      new_status: newStatus,
      latitude: tracking.last_latitude,
      longitude: tracking.last_longitude,
      activity: axes.activity,
      location: axes.location,
      timestamp,
    };

    this.eventsGateway.emitUserStatusChanged(event);
  }

  private async broadcastAreaEvent(
    direction: 'left' | 'entered',
    tracking: UserTrackingStatus,
    lat: number,
    lng: number,
    timestamp: Date,
    preResolved?: { user: User; area: Location | null } | null,
  ): Promise<void> {
    if (!tracking.location_id) return;

    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.location_id));
    if (!context || !context.area) return;

    const event: UserAreaEvent = {
      user_id: tracking.user_id,
      user_name: context.user.full_name,
      role: context.user.role as UserRole,
      location_id: tracking.location_id,
      area_name: context.area.name,
      rayon_id: context.area.rayon_id || null,
      latitude: lat,
      longitude: lng,
      timestamp,
    };

    if (direction === 'left') {
      this.eventsGateway.emitUserLeftArea(event);
    } else {
      this.eventsGateway.emitUserEnteredArea(event);
    }
  }

  private async broadcastLocationUpdate(
    tracking: UserTrackingStatus,
    lat: number,
    lng: number,
    accuracy: number | null,
    battery: number | null,
    status: TrackingStatus,
    isWithinArea: boolean,
    timestamp: Date,
    preResolved?: { user: User; area: Location | null } | null,
  ): Promise<void> {
    if (!tracking.location_id || !tracking.shift_id) return;

    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.location_id));
    if (!context) return;

    const thresholds = await this.cacheService.getThresholds();
    const axes = this.calculateAxes(
      {
        hasActiveShift: !!tracking.shift_id,
        lastLocationAt: tracking.last_location_at,
        isWithinArea,
      },
      thresholds,
      timestamp,
    );

    const event: UserLocationEvent = {
      user_id: tracking.user_id,
      user_name: context.user.full_name,
      role: context.user.role as UserRole,
      shift_id: tracking.shift_id,
      shift_name: tracking.shift_definition?.name || 'Active Shift',
      location_id: tracking.location_id,
      area_name: context.area?.name || 'Unknown',
      rayon_id: context.area?.rayon_id || null,
      latitude: lat,
      longitude: lng,
      accuracy,
      battery_level: battery,
      status,
      is_within_area: isWithinArea,
      activity: axes.activity,
      location: axes.location,
      timestamp,
    };

    this.eventsGateway.emitUserLocation(event);
  }

  /**
   * Whether this status contributes to a place's staffing — i.e. the worker is
   * clocked in. OFFLINE counts: they are at work, their phone just isn't
   * reporting. Only ABSENT (never clocked in) does not.
   */
  private isActiveStatus(status: TrackingStatus): boolean {
    return status === TrackingStatus.ACTIVE || status === TrackingStatus.OFFLINE;
  }

  private async emitStaffingChangedIfNeeded(
    locationId: string | null,
    previousStatus: TrackingStatus,
    newStatus: TrackingStatus,
    timestamp: Date,
  ): Promise<void> {
    if (!locationId) return;

    const wasActive = this.isActiveStatus(previousStatus);
    const isNowActive = this.isActiveStatus(newStatus);
    if (wasActive === isNowActive) return;

    const activeCount = await this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.location_id = :locationId', { locationId })
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.ACTIVE, TrackingStatus.OFFLINE],
      })
      .getCount();

    const reqResult = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select('SUM(req.required_count)', 'total')
      .where('req.location_id = :locationId', { locationId })
      .getRawOne();

    const requiredCount = parseInt(reqResult?.total || '0');
    if (requiredCount === 0) return;

    const area = await this.areaRepository.findOne({
      where: { id: locationId },
      select: ['id', 'rayon_id'],
    });

    const event: AreaStaffingChangedEvent = {
      location_id: locationId,
      rayon_id: area?.rayon_id || null,
      active_count: activeCount,
      required_count: requiredCount,
      is_met: activeCount >= requiredCount,
      timestamp,
    };

    // Route through debouncer when available to coalesce rapid successive
    // status changes (e.g. shift-start wave) into a single broadcast.
    if (this.staffingDebouncer) {
      this.staffingDebouncer.flag(locationId, event as unknown as Record<string, unknown>);
    } else {
      this.eventsGateway.emitAreaStaffingChanged(event);
    }
  }

  private async resolveUserContext(
    userId: string,
    locationId: string | null,
  ): Promise<{ user: User; area: Location | null } | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'full_name', 'role'],
    });

    if (!user) return null;

    const area = locationId
      ? await this.areaRepository.findOne({
          where: { id: locationId },
          select: ['id', 'name', 'rayon_id'],
        })
      : null;

    return { user, area };
  }

  private async checkWithinArea(locationId: string, lat: number, lng: number): Promise<boolean> {
    const boundary = await this.cacheService.getAreaBoundary(locationId);
    if (!boundary || boundary.length === 0) {
      return true;
    }

    const geofencing = await this.cacheService.getGeofencing();
    return this.boundaryCheck.isPointInPolygonWithTolerance(
      lat,
      lng,
      boundary[0],
      geofencing.tolerance_meters,
    );
  }

  /**
   * A worker counts as within-area if they are inside their primary (clocked-in)
   * area OR any other area on **today's generated roster** (the operational
   * source of truth — we check the day's penjadwalan, not the raw user
   * assignment). Falls back to `user_areas` only when no roster service/rows are
   * available (legacy). The extra lookup only runs when the worker is outside
   * their primary area, keeping the per-ping hot path at one boundary check.
   */
  private async checkWithinAnyAssignedArea(
    userId: string,
    primaryAreaId: string,
    lat: number,
    lng: number,
  ): Promise<boolean> {
    if (await this.checkWithinArea(primaryAreaId, lat, lng)) {
      return true;
    }
    // Union today's + yesterday's roster areas so an overnight (Shift-3) worker
    // whose roster row sits on the clock-in day is still recognized after WIB
    // midnight. Only runs when the worker is outside their primary area.
    let rosterAreas: Location[] = [];
    if (this.dailySchedulesService) {
      const today = TimezoneUtil.jakartaDateString();
      const yesterday = TimezoneUtil.jakartaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const [todayAreas, yesterdayAreas] = await Promise.all([
        this.dailySchedulesService.getActiveAreasForDay(userId, today),
        this.dailySchedulesService.getActiveAreasForDay(userId, yesterday),
      ]);
      const byId = new Map<string, Location>();
      for (const a of [...todayAreas, ...yesterdayAreas]) byId.set(a.id, a);
      rosterAreas = [...byId.values()];
    }
    const candidates =
      rosterAreas.length > 0
        ? rosterAreas
        : this.userAreasService
          ? await this.userAreasService.getEffectiveLocations(userId)
          : [];
    for (const area of candidates) {
      if (area.id === primaryAreaId) continue;
      if (await this.checkWithinArea(area.id, lat, lng)) {
        return true;
      }
    }
    return false;
  }
}
