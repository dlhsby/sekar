import { Injectable, Logger, forwardRef, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTrackingStatus, TrackingStatus, ActivityStatus, LocationStatus } from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { EventsGateway } from '../../../gateways/events.gateway';
import {
  UserStatusChangedEvent,
  UserAreaEvent,
  UserLocationEvent,
  AreaStaffingChangedEvent,
} from '../../../gateways/dto/events.dto';
import { AreaStaffRequirement } from '../../area-staff-requirements/entities/area-staff-requirement.entity';
import { StaffingDebouncerService } from './staffing-debouncer.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

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
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(AreaStaffRequirement)
    private readonly staffRequirementRepository: Repository<AreaStaffRequirement>,
    private readonly cacheService: MonitoringCacheService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    @Optional()
    private readonly staffingDebouncer: StaffingDebouncerService | undefined,
    // Phase 4-3 (M2): missing-worker alert. Optional so legacy tests that don't
    // wire NotificationsService keep working.
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Phase 4-3 (M2): notify korlap users responsible for an area when one of
   * their workers transitions to MISSING.
   *
   * Notification scope: every korlap whose `users.area_id` matches the worker's
   * area. (Multi-area korlap support via `user_areas` is M3 — for now we match
   * the primary `users.area_id` column.)
   */
  private async notifyKorlapMissingWorker(
    workerUserId: string,
    areaId: string | null,
  ): Promise<void> {
    if (!this.notificationsService || !areaId) return;
    try {
      const worker = await this.userRepository.findOne({
        where: { id: workerUserId },
        select: ['id', 'full_name'],
      });
      const workerName = worker?.full_name ?? 'pekerja';
      const korlaps = await this.userRepository.find({
        where: { role: UserRole.KORLAP, area_id: areaId, is_active: true },
        select: ['id'],
      });
      await Promise.all(
        korlaps.map((k) =>
          this.notificationsService!.sendToUser({
            user_id: k.id,
            title: 'Pekerja hilang',
            body: `${workerName} terdeteksi MISSING di area Anda. Mohon segera periksa.`,
            type: NotificationType.MISSING_WORKER_ALERT,
            data: { worker_user_id: workerUserId, area_id: areaId },
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `notifyKorlapMissingWorker failed for worker ${workerUserId}: ${(err as Error).message}`,
      );
    }
  }

  calculateStatus(
    input: StatusInput,
    thresholds: StatusThresholds,
    now: Date = new Date(),
  ): TrackingStatus {
    if (!input.hasActiveShift) {
      return TrackingStatus.OFFLINE;
    }

    if (!input.lastLocationAt) {
      return TrackingStatus.MISSING;
    }

    const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;

    if (ageSeconds > thresholds.missing_threshold_seconds) {
      return TrackingStatus.MISSING;
    }

    if (ageSeconds > thresholds.inactive_threshold_seconds) {
      return TrackingStatus.INACTIVE;
    }

    if (!input.isWithinArea && ageSeconds <= thresholds.active_max_age_seconds) {
      return TrackingStatus.OUTSIDE_AREA;
    }

    if (ageSeconds <= thresholds.active_max_age_seconds) {
      return TrackingStatus.ACTIVE;
    }

    return TrackingStatus.INACTIVE;
  }

  calculateAxes(
    input: StatusInput,
    thresholds: StatusThresholds,
    now: Date = new Date(),
  ): { activity: ActivityStatus; location: LocationStatus } {
    let activity: ActivityStatus;
    if (!input.hasActiveShift) {
      activity = 'offline';
    } else if (!input.lastLocationAt) {
      activity = 'missing';
    } else {
      const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;
      if (ageSeconds > thresholds.missing_threshold_seconds) {
        activity = 'missing';
      } else if (ageSeconds > thresholds.active_max_age_seconds) {
        activity = 'idle';
      } else {
        activity = 'aktif';
      }
    }

    const location: LocationStatus =
      activity === 'offline' || activity === 'missing'
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
      await this.emitStaffingChangedIfNeeded(existing.area_id, previousStatus, newStatus, now);

      // Phase 4-3 (M2): alert korlap on transition into MISSING. Fire-and-forget;
      // do not block the status calculation if notification dispatch fails.
      if (newStatus === TrackingStatus.MISSING && previousStatus !== TrackingStatus.MISSING) {
        void this.notifyKorlapMissingWorker(userId, existing.area_id);
      }

      this.logger.debug(`User ${userId} status: ${previousStatus} → ${newStatus}`);
    }

    return existing;
  }

  async onClockIn(
    userId: string,
    shiftId: string,
    areaId: string | null,
    shiftDefinitionId: string | null,
    clockInLat?: number,
    clockInLng?: number,
  ): Promise<void> {
    const now = new Date();

    let isWithinArea = true;
    if (areaId && clockInLat !== undefined && clockInLng !== undefined) {
      isWithinArea = await this.checkWithinArea(areaId, clockInLat, clockInLng);
    }

    // Resolve rayon_id: from user.rayon_id first, then from area's rayon_id
    let rayonId: string | null = null;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'rayon_id'],
    });
    if (user?.rayon_id) {
      rayonId = user.rayon_id;
    } else if (areaId) {
      const area = await this.areaRepository.findOne({
        where: { id: areaId },
        select: ['id', 'rayon_id'],
      });
      rayonId = area?.rayon_id || null;
    }

    await this.trackingRepository.upsert(
      {
        user_id: userId,
        shift_id: shiftId,
        shift_definition_id: shiftDefinitionId,
        area_id: areaId,
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
    const existing = await this.trackingRepository.findOne({
      where: { user_id: userId },
    });

    const previousStatus = existing?.status || TrackingStatus.ACTIVE;
    const areaId = existing?.area_id || null;
    const now = new Date();

    await this.trackingRepository.upsert(
      {
        user_id: userId,
        shift_id: null,
        shift_definition_id: null,
        area_id: null,
        rayon_id: null,
        status: TrackingStatus.OFFLINE,
        is_within_area: true,
        updated_at: now,
      },
      ['user_id'],
    );

    this.logger.log(`User ${userId} clocked out → OFFLINE`);
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
    if (existing.area_id) {
      isWithinArea = await this.checkWithinArea(existing.area_id, lat, lng);
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
      : await this.resolveUserContext(existing.user_id, existing.area_id);

    // Broadcast boundary crossing events via WebSocket
    if (previousWithinArea && !isWithinArea) {
      await this.broadcastAreaEvent('left', existing, lat, lng, now, context);
    } else if (!previousWithinArea && isWithinArea) {
      await this.broadcastAreaEvent('entered', existing, lat, lng, now, context);
    }

    // Broadcast status change via WebSocket if changed
    if (newStatus !== previousStatus) {
      await this.broadcastStatusChanged(existing, previousStatus, newStatus, now, context);
      await this.emitStaffingChangedIfNeeded(existing.area_id, previousStatus, newStatus, now);
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
    preResolved?: { user: User; area: Area | null } | null,
  ): Promise<void> {
    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.area_id));
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
      area_id: tracking.area_id,
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
    preResolved?: { user: User; area: Area | null } | null,
  ): Promise<void> {
    if (!tracking.area_id) return;

    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.area_id));
    if (!context || !context.area) return;

    const event: UserAreaEvent = {
      user_id: tracking.user_id,
      user_name: context.user.full_name,
      role: context.user.role as UserRole,
      area_id: tracking.area_id,
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
    preResolved?: { user: User; area: Area | null } | null,
  ): Promise<void> {
    if (!tracking.area_id || !tracking.shift_id) return;

    const context =
      preResolved ?? (await this.resolveUserContext(tracking.user_id, tracking.area_id));
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
      area_id: tracking.area_id,
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

  private isActiveStatus(status: TrackingStatus): boolean {
    return (
      status === TrackingStatus.ACTIVE ||
      status === TrackingStatus.INACTIVE ||
      status === TrackingStatus.OUTSIDE_AREA
    );
  }

  private async emitStaffingChangedIfNeeded(
    areaId: string | null,
    previousStatus: TrackingStatus,
    newStatus: TrackingStatus,
    timestamp: Date,
  ): Promise<void> {
    if (!areaId) return;

    const wasActive = this.isActiveStatus(previousStatus);
    const isNowActive = this.isActiveStatus(newStatus);
    if (wasActive === isNowActive) return;

    const activeCount = await this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.area_id = :areaId', { areaId })
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.ACTIVE, TrackingStatus.INACTIVE, TrackingStatus.OUTSIDE_AREA],
      })
      .getCount();

    const reqResult = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select('SUM(req.required_count)', 'total')
      .where('req.area_id = :areaId', { areaId })
      .getRawOne();

    const requiredCount = parseInt(reqResult?.total || '0');
    if (requiredCount === 0) return;

    const area = await this.areaRepository.findOne({
      where: { id: areaId },
      select: ['id', 'rayon_id'],
    });

    const event: AreaStaffingChangedEvent = {
      area_id: areaId,
      rayon_id: area?.rayon_id || null,
      active_count: activeCount,
      required_count: requiredCount,
      is_met: activeCount >= requiredCount,
      timestamp,
    };

    // Route through debouncer when available to coalesce rapid successive
    // status changes (e.g. shift-start wave) into a single broadcast.
    if (this.staffingDebouncer) {
      this.staffingDebouncer.flag(areaId, event as unknown as Record<string, unknown>);
    } else {
      this.eventsGateway.emitAreaStaffingChanged(event);
    }
  }

  private async resolveUserContext(
    userId: string,
    areaId: string | null,
  ): Promise<{ user: User; area: Area | null } | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'full_name', 'role'],
    });

    if (!user) return null;

    const area = areaId
      ? await this.areaRepository.findOne({
          where: { id: areaId },
          select: ['id', 'name', 'rayon_id'],
        })
      : null;

    return { user, area };
  }

  private async checkWithinArea(areaId: string, lat: number, lng: number): Promise<boolean> {
    const boundary = await this.cacheService.getAreaBoundary(areaId);
    if (!boundary || boundary.length === 0) {
      return true;
    }

    const geofencing = await this.cacheService.getGeofencing();
    return this.isPointInPolygonWithTolerance(lat, lng, boundary[0], geofencing.tolerance_meters);
  }

  private isPointInPolygonWithTolerance(
    lat: number,
    lng: number,
    polygon: number[][],
    toleranceMeters: number,
  ): boolean {
    if (this.isPointInPolygon(lat, lng, polygon)) {
      return true;
    }

    const toleranceDegrees = toleranceMeters / 111_320;
    const expandedPolygon = this.expandPolygon(polygon, toleranceDegrees);
    return this.isPointInPolygon(lat, lng, expandedPolygon);
  }

  private isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1];
      const yi = polygon[i][0];
      const xj = polygon[j][1];
      const yj = polygon[j][0];

      const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private expandPolygon(polygon: number[][], degrees: number): number[][] {
    if (polygon.length < 3) return polygon;

    const centroidLng = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const centroidLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

    return polygon.map((point) => {
      const dx = point[0] - centroidLng;
      const dy = point[1] - centroidLat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return point;
      const scale = (dist + degrees) / dist;
      return [centroidLng + dx * scale, centroidLat + dy * scale];
    });
  }
}
