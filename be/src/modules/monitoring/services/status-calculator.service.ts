import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { EventsGateway } from '../../../gateways/events.gateway';
import {
  UserStatusChangedEvent,
  UserAreaEvent,
  UserLocationEvent,
} from '../../../gateways/dto/events.dto';

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
    private readonly cacheService: MonitoringCacheService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  calculateStatus(
    input: StatusInput,
    thresholds: StatusThresholds,
    now: Date = new Date(),
  ): TrackingStatus {
    if (!input.hasActiveShift) {
      return TrackingStatus.OFFLINE;
    }

    if (!input.lastLocationAt) {
      return TrackingStatus.INACTIVE;
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

      this.eventEmitter.emit('monitoring.status-changed', {
        userId,
        previousStatus,
        newStatus,
        areaId: existing.area_id,
        shiftId: existing.shift_id,
        timestamp: now,
      });

      await this.broadcastStatusChanged(existing, previousStatus, newStatus, now);

      this.logger.debug(`User ${userId} status: ${previousStatus} → ${newStatus}`);
    }

    return existing;
  }

  async onClockIn(
    userId: string,
    shiftId: string,
    areaId: string | null,
    shiftDefinitionId: string | null,
  ): Promise<void> {
    const now = new Date();

    await this.trackingRepository.upsert(
      {
        user_id: userId,
        shift_id: shiftId,
        shift_definition_id: shiftDefinitionId,
        area_id: areaId,
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        updated_at: now,
      },
      ['user_id'],
    );

    this.eventEmitter.emit('monitoring.status-changed', {
      userId,
      previousStatus: TrackingStatus.OFFLINE,
      newStatus: TrackingStatus.ACTIVE,
      areaId,
      shiftId,
      timestamp: now,
    });

    this.logger.log(`User ${userId} clocked in → ACTIVE`);
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
        status: TrackingStatus.OFFLINE,
        is_within_area: true,
        updated_at: now,
      },
      ['user_id'],
    );

    this.eventEmitter.emit('monitoring.status-changed', {
      userId,
      previousStatus,
      newStatus: TrackingStatus.OFFLINE,
      areaId,
      shiftId: null,
      timestamp: now,
    });

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
    const existing = await this.trackingRepository.findOne({
      where: { user_id: userId },
      relations: ['shift_definition'],
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

    // Emit boundary crossing events
    if (previousWithinArea && !isWithinArea) {
      this.eventEmitter.emit('monitoring.user-left-area', {
        userId,
        areaId: existing.area_id,
        lat,
        lng,
        timestamp: now,
      });
      await this.broadcastAreaEvent('left', existing, lat, lng, now);
    } else if (!previousWithinArea && isWithinArea) {
      this.eventEmitter.emit('monitoring.user-entered-area', {
        userId,
        areaId: existing.area_id,
        lat,
        lng,
        timestamp: now,
      });
      await this.broadcastAreaEvent('entered', existing, lat, lng, now);
    }

    // Emit status change event if changed
    if (newStatus !== previousStatus) {
      this.eventEmitter.emit('monitoring.status-changed', {
        userId,
        previousStatus,
        newStatus,
        areaId: existing.area_id,
        shiftId: existing.shift_id,
        timestamp: now,
      });
      await this.broadcastStatusChanged(existing, previousStatus, newStatus, now);
    }

    // Always emit location update
    await this.broadcastLocationUpdate(existing, lat, lng, accuracy, battery, newStatus, isWithinArea, now);
  }

  // ---- Private broadcast helpers ----

  private async broadcastStatusChanged(
    tracking: UserTrackingStatus,
    previousStatus: TrackingStatus,
    newStatus: TrackingStatus,
    timestamp: Date,
  ): Promise<void> {
    const context = await this.resolveUserContext(tracking.user_id, tracking.area_id);
    if (!context) return;

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
  ): Promise<void> {
    if (!tracking.area_id) return;

    const context = await this.resolveUserContext(tracking.user_id, tracking.area_id);
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
  ): Promise<void> {
    if (!tracking.area_id || !tracking.shift_id) return;

    const context = await this.resolveUserContext(tracking.user_id, tracking.area_id);
    if (!context) return;

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
      timestamp,
    };

    this.eventsGateway.emitUserLocation(event);
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
      ? await this.areaRepository.findOne({ where: { id: areaId }, select: ['id', 'name', 'rayon_id'] })
      : null;

    return { user, area };
  }

  private async checkWithinArea(
    areaId: string,
    lat: number,
    lng: number,
  ): Promise<boolean> {
    const boundary = await this.cacheService.getAreaBoundary(areaId);
    if (!boundary || boundary.length === 0) {
      return true;
    }

    const geofencing = await this.cacheService.getGeofencing();
    return this.isPointInPolygonWithTolerance(
      lat,
      lng,
      boundary[0],
      geofencing.tolerance_meters,
    );
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

      const intersect =
        yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private expandPolygon(polygon: number[][], degrees: number): number[][] {
    if (polygon.length < 3) return polygon;

    const centroidLng =
      polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const centroidLat =
      polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

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
