# Phase 2D: Backend Requirements

**Last Updated:** 2026-03-03
**Status:** Planning
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM
**Related ADR:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), ADR-011 (new)
**See also:** [Database Schema](./database.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| Entity/File | Key Facts |
|-------------|-----------|
| `MonitoringService` | N+1 queries per dashboard load; `is_within_area` hardcoded to `true`; `shift_name` hardcoded to `'Active Shift'` |
| `MonitoringController` | 4 endpoints: `/city`, `/rayon/:id`, `/area/:id`, `/live-users` |
| `EventsGateway` | Uses `payload.role === 'Admin'` (PascalCase, broken for Phase 2C roles) |
| `ONLINE_THRESHOLD_MS` | Hardcoded `10 * 60 * 1000` in monitoring service |
| `LocationService` | 3 endpoints: `/batch`, `/user/:userId`, `/user/:userId/latest` |
| `GpsUtil` | Has `isPointInPolygon()`, `isWithinAreaBoundary()`, `calculateDistance()` |
| `StaffRequirementStatusDto` | Uses total count, not per-role breakdown |
| `ShiftsService` | Clock-in auto-detects area from Schedule; soft geofencing sets `clock_in_outside_boundary` |

---

## Module Changes Overview

| Module | Change Type | Description |
|--------|-------------|-------------|
| `monitoring` | Major enhancement | New services, entities, endpoints, cron scheduler |
| `location` | Minor enhancement | Trigger status update on batch upload |
| `shifts` | Minor enhancement | Link to shift_definition on clock-in |
| `gateways` | Fix + Enhancement | Fix role checks, add new events |
| `areas` | Minor enhancement | Boundary CRUD endpoints |

---

## A. Monitoring Module -- New Entities

### A1. MonitoringConfig Entity

**File:** `be/src/modules/monitoring/entities/monitoring-config.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('monitoring_configs')
export class MonitoringConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
```

### A2. UserTrackingStatus Entity

**File:** `be/src/modules/monitoring/entities/user-tracking-status.entity.ts`

```typescript
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { ShiftDefinition } from '../../shifts/entities/shift-definition.entity';
import { Area } from '../../areas/entities/area.entity';

export enum TrackingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUTSIDE_AREA = 'outside_area',
  MISSING = 'missing',
  OFFLINE = 'offline',
}

@Entity('user_tracking_status')
export class UserTrackingStatus {
  @PrimaryColumn('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  shift_id: string | null;

  @ManyToOne(() => Shift, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ type: 'uuid', nullable: true })
  shift_definition_id: string | null;

  @ManyToOne(() => ShiftDefinition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_definition_id' })
  shiftDefinition: ShiftDefinition;

  @Column({
    type: 'varchar',
    length: 20,
    default: TrackingStatus.OFFLINE,
  })
  status: TrackingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  last_latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  last_longitude: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  last_accuracy_meters: number | null;

  @Column({ type: 'int', nullable: true })
  last_battery_level: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_location_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_within_area: boolean;

  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @ManyToOne(() => Area, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
```

---

## B. Monitoring Module -- New Services

### B1. StatusCalculatorService

**File:** `be/src/modules/monitoring/services/status-calculator.service.ts`

Core business logic for computing user tracking status. Called on every location ping and by the cron scheduler.

```typescript
@Injectable()
export class StatusCalculatorService {
  constructor(
    private readonly trackingStatusRepo: Repository<UserTrackingStatus>,
    private readonly shiftRepo: Repository<Shift>,
    private readonly scheduleRepo: Repository<Schedule>,
    private readonly cacheService: MonitoringCacheService,
  ) {}

  /**
   * Recalculate and upsert tracking status for a user.
   * Returns the new status and whether it changed.
   */
  async recalculate(userId: string): Promise<{
    status: TrackingStatus;
    changed: boolean;
    previousStatus: TrackingStatus | null;
  }>;

  /**
   * Pure function: compute status from inputs.
   * Extracted for testability.
   */
  calculateStatus(input: StatusInput, thresholds: StatusThresholds, now: Date): TrackingStatus;

  /**
   * Update tracking status on clock-in event.
   */
  async onClockIn(userId: string, shiftId: string, areaId: string | null, shiftDefinitionId: string | null): Promise<void>;

  /**
   * Update tracking status on clock-out event.
   */
  async onClockOut(userId: string): Promise<void>;

  /**
   * Update tracking status on location ping.
   */
  async onLocationPing(userId: string, latitude: number, longitude: number, accuracy: number | null, batteryLevel: number | null, loggedAt: Date): Promise<void>;
}
```

**Status calculation algorithm:**

```typescript
interface StatusInput {
  hasActiveShift: boolean;
  isScheduledNow: boolean;
  lastLocationAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  area: {
    boundary_polygon?: { type?: string; coordinates?: number[][][] };
    gps_lat?: number;
    gps_lng?: number;
    radius_meters?: number;
  } | null;
}

interface StatusThresholds {
  active_max_age_seconds: number;     // default: 300
  inactive_threshold_seconds: number; // default: 900
  missing_threshold_seconds: number;  // default: 3600
}

function calculateStatus(input: StatusInput, thresholds: StatusThresholds, now: Date): TrackingStatus {
  if (!input.hasActiveShift) {
    return input.isScheduledNow ? TrackingStatus.MISSING : TrackingStatus.OFFLINE;
  }

  if (!input.lastLocationAt || !input.latitude || !input.longitude) {
    return TrackingStatus.MISSING;
  }

  const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;

  if (ageSeconds > thresholds.missing_threshold_seconds) {
    return TrackingStatus.MISSING;
  }

  if (ageSeconds > thresholds.inactive_threshold_seconds) {
    return TrackingStatus.INACTIVE;
  }

  if (ageSeconds <= thresholds.active_max_age_seconds && input.area) {
    const isInside = GpsUtil.isWithinAreaBoundary(input.latitude, input.longitude, input.area);
    return isInside ? TrackingStatus.ACTIVE : TrackingStatus.OUTSIDE_AREA;
  }

  if (ageSeconds <= thresholds.active_max_age_seconds) {
    return TrackingStatus.ACTIVE; // No area boundary defined
  }

  return TrackingStatus.INACTIVE;
}
```

### B2. MonitoringSchedulerService

**File:** `be/src/modules/monitoring/services/monitoring-scheduler.service.ts`

Cron job that re-evaluates stale statuses every 60 seconds.

```typescript
@Injectable()
export class MonitoringSchedulerService {
  constructor(
    private readonly trackingStatusRepo: Repository<UserTrackingStatus>,
    private readonly statusCalculator: StatusCalculatorService,
    private readonly cacheService: MonitoringCacheService,
    private readonly logger: Logger,
  ) {}

  /**
   * Every 60 seconds: find users with active/inactive/outside_area status
   * whose last_location_at is older than active_max_age_seconds.
   * Re-evaluate their status (may transition from active -> inactive -> missing).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async reevaluateStaleStatuses(): Promise<void>;
}
```

### B3. MonitoringCacheService

**File:** `be/src/modules/monitoring/services/monitoring-cache.service.ts`

In-memory cache for config and area boundaries to avoid repeated DB reads.

```typescript
@Injectable()
export class MonitoringCacheService {
  private thresholdsCache: StatusThresholds | null = null;
  private thresholdsCacheExpiry = 0;
  private areaBoundaryCache = new Map<string, AreaBoundaryWithExpiry>();

  private readonly THRESHOLDS_TTL_MS = 60_000;   // 1 min
  private readonly BOUNDARY_TTL_MS = 300_000;     // 5 min

  async getThresholds(): Promise<StatusThresholds>;
  async getAreaBoundary(areaId: string): Promise<AreaBoundary>;
  invalidateAreaBoundary(areaId: string): void;
  invalidateThresholds(): void;
}
```

**Why not Redis:** At 8 pings/second (500 users x 1 ping/60s), in-process `Map` with TTL is sufficient. Redis would add network latency and operational complexity for negligible benefit at this scale. If the system scales to multiple backend instances, introduce Redis then.

### B4. MonitoringConfigService

**File:** `be/src/modules/monitoring/services/monitoring-config.service.ts`

CRUD for monitoring configuration with Zod validation.

```typescript
@Injectable()
export class MonitoringConfigService {
  private readonly SCHEMA_MAP: Record<string, z.ZodSchema> = {
    status_thresholds: z.object({
      active_max_age_seconds: z.number().min(60).max(600),
      inactive_threshold_seconds: z.number().min(300).max(3600),
      missing_threshold_seconds: z.number().min(1800).max(7200),
      location_ping_interval_seconds: z.number().min(30).max(300),
    }),
    geofencing: z.object({
      tolerance_meters: z.number().min(0).max(500),
      outside_area_grace_seconds: z.number().min(0).max(600),
    }),
  };

  async getAll(): Promise<MonitoringConfig[]>;
  async getByKey(key: string): Promise<MonitoringConfig>;
  async update(key: string, value: Record<string, any>): Promise<MonitoringConfig>;
}
```

---

## C. Modified Endpoints

### C1. `GET /monitoring/live-users` -- Enhanced

**Changes:**
- Response uses `user_tracking_status` table (single join query, replaces N+1)
- `is_within_area` now computed from GPS + boundary (not hardcoded)
- `shift_name` from `shift_definitions.name` join (not hardcoded)
- New `status` field with four-status model
- New `phone` field for WhatsApp deeplinks
- New filter: `status` parameter
- Response totals: `total_active`, `total_inactive`, `total_outside_area`, `total_missing` (replaces `total_online`)

**Enhanced Request DTO:**

```typescript
export class LiveUsersFilterDto {
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @IsUUID()
  @IsOptional()
  area_id?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: string;

  @IsEnum(TrackingStatus)
  @IsOptional()
  status?: TrackingStatus;    // NEW: filter by tracking status
}
```

**Enhanced Response DTO:**

```typescript
export class LiveUserDto {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;                  // NEW: for WhatsApp deeplinks
  status: TrackingStatus;                // NEW: 'active' | 'inactive' | 'outside_area' | 'missing'
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: Date;
  is_within_area: boolean;               // NOW COMPUTED (was hardcoded true)
  shift_id: string;
  shift_name: string;                    // NOW FROM shift_definitions.name (was hardcoded 'Active Shift')
  shift_definition_id: string | null;    // NEW
  clock_in_time: Date;
  current_task_status: string | null;
  current_task_title: string | null;
}

export class LiveUsersResponseDto {
  total_active: number;                  // NEW (replaces total_online)
  total_inactive: number;               // NEW
  total_outside_area: number;            // NEW
  total_missing: number;                 // NEW
  total_offline: number;

  /** @deprecated Use total_active. Will be removed in Phase 3. */
  total_online: number;                  // DEPRECATED: alias for total_active

  users: LiveUserDto[];
  generated_at: Date;
}
```

### C2. `GET /monitoring/area/:id` -- Enhanced Staff Requirements

**Enhanced StaffRequirementStatusDto:**

```typescript
export class StaffRequirementStatusDto {
  id: string;
  role: string;                          // 'satgas' | 'linmas' (per-role breakdown)
  required_count: number;
  current_count: number;                 // NOW: counted per role (was total count)
  active_count: number;                  // NEW: those with status 'active'
  inactive_count: number;               // NEW
  outside_area_count: number;            // NEW
  missing_count: number;                 // NEW
  delta: number;
  is_met: boolean;
}

export class UserStatusDto {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;                  // NEW
  status: TrackingStatus;                // NEW: replaces is_online boolean
  last_lat: number | null;
  last_lng: number | null;
  last_location_update: Date | null;
  is_within_area: boolean;               // NOW COMPUTED
  current_shift_id: string | null;
  shift_name: string | null;             // NEW: from shift_definitions
  clock_in_time: Date | null;
}
```

---

## D. New Endpoints

### D1. `GET /monitoring/users/:userId/location-history`

Location playback for a specific user on a specific date.

**Auth:** `@Roles(...MONITORING_AREA)` with scope check

```typescript
// Query parameters
export class LocationHistoryQueryDto {
  @IsDateString()
  date: string;                          // YYYY-MM-DD

  @IsUUID()
  @IsOptional()
  shift_id?: string;                     // Optional: filter to specific shift
}

// Response
export class LocationHistoryPointDto {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: Date;
  is_within_area: boolean;              // Computed per-point against area boundary
}

export class LocationHistoryResponseDto {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  area_name: string | null;
  clock_in_time: Date | null;
  clock_out_time: Date | null;
  points: LocationHistoryPointDto[];
  total_points: number;
  total_distance_meters: number;         // Sum of haversine between consecutive points
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: Date;
}
```

**Performance:** Max ~960 points per day (16h x 60 pings/hr). Uses composite index `idx_location_logs_user_shift_time`. Single-day restriction enforced.

**Scope checking:**
- `korlap`: Can only view users in their own area
- `kepala_rayon`: Can only view users in their rayon
- `top_management`, `admin_system`, `superadmin`: Can view any user

### D2. `GET /monitoring/users/:userId/day-summary`

Quick detail data for map marker click (user detail modal).

**Auth:** `@Roles(...MONITORING_AREA)` with scope check

```typescript
export class UserDaySummaryDto {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  shift: {
    id: string;
    name: string;
    clock_in_time: Date;
    clock_out_time: Date | null;
    duration_minutes: number;
    outside_boundary: boolean;
  } | null;
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    battery_level: number | null;
    logged_at: Date;
    is_within_area: boolean;
  } | null;
  activities_today: {
    id: string;
    title: string;
    activity_type: string;
    created_at: Date;
    photo_url: string | null;
  }[];
  tasks_today: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  whatsapp_links: {
    chat: string;                        // https://wa.me/62xxx
    call: string;                        // tel:+62xxx
  } | null;
}
```

### D3. `GET /monitoring/config` and `PATCH /monitoring/config/:key`

Admin configuration management.

**Auth:** `@Roles('admin_system', 'superadmin')`

```typescript
// GET /monitoring/config -- list all configs
export class MonitoringConfigResponseDto {
  configs: MonitoringConfigDto[];
}

export class MonitoringConfigDto {
  key: string;
  value: Record<string, any>;
  description: string;
  updated_at: Date;
}

// PATCH /monitoring/config/:key -- update a config
export class UpdateMonitoringConfigDto {
  @IsObject()
  value: Record<string, any>;          // Validated by Zod schema per key
}
```

### D4. `GET /areas/:id/boundary` and `PUT /areas/:id/boundary`

Dedicated endpoints for polygon boundary management.

**Auth:** `@Roles('admin_system', 'superadmin')`

```typescript
// GET response
export class AreaBoundaryResponseDto {
  area_id: string;
  name: string;
  boundary_polygon: GeoJsonPolygon | null;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  coverage_area: number | null;
}

// PUT request body
export class UpdateAreaBoundaryDto {
  @IsObject()
  boundary_polygon: GeoJsonPolygon;

  @IsNumber()
  @IsOptional()
  coverage_area?: number;               // Auto-computed if not provided
}

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];            // [[[lng, lat], ...]]
}
```

**Validation on PUT:**
- GeoJSON type must be `'Polygon'`
- Outer ring must have >= 4 points (3 vertices + closing point)
- Ring must be closed (first point === last point)
- Coordinates must be within Surabaya bounding box (112.5-113.0 lng, -7.5 to -7.0 lat)
- Auto-computes `coverage_area` using Shoelace formula if not provided
- Invalidates `MonitoringCacheService` boundary cache for the area
- Triggers status recalculation for all users assigned to the area

### D5. `GET /monitoring/staffing-summary`

Aggregated staffing overview for the filter modal.

**Auth:** `@Roles(...MONITORING_AREA)` with scope check

```typescript
export class StaffingSummaryQueryDto {
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @IsUUID()
  @IsOptional()
  area_id?: string;
}

export class StaffingSummaryItemDto {
  id: string;                            // rayon_id or area_id
  name: string;
  type: 'rayon' | 'area';
  roles: {
    role: string;                        // 'korlap' | 'satgas' | 'linmas'
    active: number;
    idle: number;
    outside_area: number;
    missing: number;
    offline: number;
    total_assigned: number;
    total_required: number;              // From shift_definitions for current shift
  }[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

export class StaffingSummaryResponseDto {
  items: StaffingSummaryItemDto[];
  generated_at: Date;
}
```

---

## E. WebSocket Gateway Fixes and Enhancements

### E1. Fix Legacy Role Checks

**File:** `be/src/gateways/events.gateway.ts`

```typescript
// BEFORE (broken -- line ~87):
if (payload.role === 'Admin' || payload.role === 'TopManagement') {
  client.join('city');
}

// AFTER (correct):
const CITY_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT];
if (CITY_ROLES.includes(payload.role)) {
  client.join('city');
}
```

### E2. Auto-Join Rooms Based on Role Assignment

```typescript
async handleConnection(client: Socket): Promise<void> {
  // ... existing JWT verification ...
  const { sub: userId, role } = payload;

  // Personal room
  client.join(`user:${userId}`);

  // Role-based auto-join
  if ([UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT].includes(role)) {
    client.join('city');
  }

  if ([UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA].includes(role)) {
    const user = await this.userService.findById(userId);
    if (user?.rayon_id) {
      client.join(`rayon:${user.rayon_id}`);
    }
  }

  if (role === UserRole.KORLAP) {
    const user = await this.userService.findById(userId);
    if (user?.area_id) {
      client.join(`area:${user.area_id}`);
    }
  }
}
```

### E3. New WebSocket Events

```typescript
export enum EventType {
  // Existing
  USER_LOCATION = 'user:location',
  USER_CLOCK_IN = 'user:clock-in',
  USER_CLOCK_OUT = 'user:clock-out',
  AREA_STAFFING = 'area:staffing',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',

  // New (Phase 2D)
  USER_STATUS_CHANGED = 'user:status-changed',
  USER_LEFT_AREA = 'user:left-area',
  USER_ENTERED_AREA = 'user:entered-area',
}
```

**New Event Payloads:**

```typescript
export class UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  timestamp: Date;
}

export class UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: Date;
}
```

**Enhanced existing `UserLocationEvent`:**

```typescript
export class UserLocationEvent {
  // Existing fields...
  user_id: string;
  user_name: string;
  role: string;
  shift_id: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  timestamp: Date;

  // New fields (Phase 2D)
  status: TrackingStatus;
  is_within_area: boolean;
  shift_name: string;
}
```

### E4. Event Emission Integration

Events are emitted from `StatusCalculatorService` when status changes:

```typescript
// In StatusCalculatorService.onLocationPing():
if (statusChanged) {
  this.eventsGateway.emitUserStatusChanged({
    user_id: userId,
    previous_status: oldStatus,
    new_status: newStatus,
    // ... other fields
  });
}

if (wasInsideArea && !isInsideArea) {
  this.eventsGateway.emitUserLeftArea({ ... });
}

if (!wasInsideArea && isInsideArea) {
  this.eventsGateway.emitUserEnteredArea({ ... });
}

// Always emit location update
this.eventsGateway.emitUserLocation({ ... });
```

---

## F. Location Module Integration

### F1. Trigger Status Update on Batch Upload

**File:** `be/src/modules/location/location.service.ts`

After inserting location logs in `createBatchLogs()`, call status calculator:

```typescript
async createBatchLogs(userId: string, dto: CreateLocationBatchDto): Promise<void> {
  // ... existing validation and batch insert ...

  // NEW: Update tracking status with latest location from batch
  const latestLocation = dto.locations.sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  )[0];

  await this.statusCalculator.onLocationPing(
    userId,
    latestLocation.gps_lat,
    latestLocation.gps_lng,
    latestLocation.accuracy_meters ?? null,
    latestLocation.battery_level ?? null,
    new Date(latestLocation.logged_at),
  );
}
```

---

## G. Shifts Module Integration

### G1. Link Shift to ShiftDefinition on Clock-In

**File:** `be/src/modules/shifts/shifts.service.ts`

When creating a shift on clock-in, also resolve and store the `shift_definition_id`:

```typescript
async clockIn(userId: string, dto: ClockInDto): Promise<Shift> {
  // ... existing logic ...

  // NEW: Resolve shift definition
  const shiftDefinition = await this.resolveShiftDefinition(area?.id, now);

  const shift = this.shiftRepo.create({
    user_id: userId,
    area_id: area?.id ?? null,
    shift_definition_id: shiftDefinition?.id ?? null,  // NEW
    clock_in_time: now,
    clock_in_gps_lat: dto.gps_lat,
    clock_in_gps_lng: dto.gps_lng,
    clock_in_photo_url: photoUrl,
    clock_in_outside_boundary: isOutside,
  });

  const saved = await this.shiftRepo.save(shift);

  // NEW: Update tracking status
  await this.statusCalculator.onClockIn(userId, saved.id, area?.id ?? null, shiftDefinition?.id ?? null);

  return saved;
}

async clockOut(userId: string, dto: ClockOutDto): Promise<Shift> {
  // ... existing logic ...

  // NEW: Update tracking status
  await this.statusCalculator.onClockOut(userId);

  return saved;
}
```

---

## H. GeoJSON Validation Utility

**File:** `be/src/common/utils/geojson-validator.util.ts`

```typescript
export class GeoJsonValidator {
  static validatePolygon(polygon: GeoJsonPolygon): string[];
  static computeAreaSqMeters(polygon: number[][]): number;
  static isClosedRing(ring: number[][]): boolean;
  static isWithinSurabayaBounds(coordinates: number[][]): boolean;
}
```

**Validation rules:**
- `type` must be `'Polygon'`
- `coordinates` must have at least one ring (outer ring)
- Outer ring must have >= 4 points (3 vertices + closing point)
- Ring must be closed (first point === last point)
- All coordinates within Surabaya bounds (112.5-113.0 lng, -7.5 to -7.0 lat)

---

## I. Module File Structure

```
be/src/modules/monitoring/
  entities/
    monitoring-config.entity.ts                 NEW
    user-tracking-status.entity.ts              NEW
  services/
    status-calculator.service.ts                NEW
    monitoring-scheduler.service.ts             NEW
    monitoring-cache.service.ts                 NEW
    monitoring-config.service.ts                NEW
    monitoring.service.ts                       MODIFIED
  dto/
    live-users.dto.ts                           MODIFIED
    area-stats.dto.ts                           MODIFIED
    location-history.dto.ts                     NEW
    user-day-summary.dto.ts                     NEW
    monitoring-config.dto.ts                    NEW
    area-boundary.dto.ts                        NEW
    staffing-summary.dto.ts                     NEW
  monitoring.controller.ts                      MODIFIED
  monitoring.module.ts                          MODIFIED

be/src/gateways/
  events.gateway.ts                             MODIFIED
  dto/events.dto.ts                             MODIFIED

be/src/modules/shifts/
  entities/shift.entity.ts                      MODIFIED (add shift_definition_id)
  shifts.service.ts                             MODIFIED (link shift_definition, trigger status)

be/src/modules/location/
  location.service.ts                           MODIFIED (trigger status on batch upload)

be/src/modules/areas/
  areas.controller.ts                           MODIFIED (boundary CRUD endpoints)

be/src/common/utils/
  geojson-validator.util.ts                     NEW

be/src/database/migrations/
  XXXXXXXXX-Phase2dMonitoringReimpl.ts          NEW
```

---

## J. API Endpoints Summary (Phase 2D)

| Method | Endpoint | Auth | Change | Description |
|--------|----------|------|--------|-------------|
| GET | `/monitoring/city` | top_management+ | Enhanced | Uses tracking status table |
| GET | `/monitoring/rayon/:id` | kepala_rayon+ | Enhanced | Uses tracking status table |
| GET | `/monitoring/area/:id` | korlap+ | Enhanced | Per-role staff counts |
| GET | `/monitoring/live-users` | korlap+ | Enhanced | Four-status, computed fields |
| GET | `/monitoring/users/:userId/location-history` | korlap+ | **NEW** | GPS trail for playback |
| GET | `/monitoring/users/:userId/day-summary` | korlap+ | **NEW** | Detail modal data |
| GET | `/monitoring/config` | admin_system+ | **NEW** | List config values |
| PATCH | `/monitoring/config/:key` | admin_system+ | **NEW** | Update config |
| GET | `/monitoring/staffing-summary` | korlap+ | **NEW** | Filter modal data |
| GET | `/areas/:id/boundary` | admin_system+ | **NEW** | Get area polygon |
| PUT | `/areas/:id/boundary` | admin_system+ | **NEW** | Update area polygon |

**Total new endpoints:** 7
**Total modified endpoints:** 4

---

## K. Implementation Checklist

### Phase 2D-1: Foundation
- [ ] Create `MonitoringConfig` entity
- [ ] Create `UserTrackingStatus` entity
- [ ] Write database migration (tables, indexes)
- [ ] Implement `StatusCalculatorService` with unit tests
- [ ] Implement `MonitoringSchedulerService` with unit tests
- [ ] Implement `MonitoringCacheService` with unit tests
- [ ] Implement `MonitoringConfigService` with unit tests
- [ ] Add `shift_definition_id` to Shift entity
- [ ] Run backfill scripts

### Phase 2D-2: Fix Hardcodes
- [ ] Fix `is_within_area` computation in MonitoringService
- [ ] Fix `shift_name` to use ShiftDefinition join
- [ ] Fix WebSocket role checks (PascalCase -> lowercase)
- [ ] Fix per-role staff requirement counting

### Phase 2D-3: New Endpoints
- [ ] Implement location history endpoint with tests
- [ ] Implement user day summary endpoint with tests
- [ ] Implement monitoring config CRUD with tests
- [ ] Implement area boundary CRUD with tests
- [ ] Implement staffing summary endpoint with tests
- [ ] Add GeoJSON validator utility with tests

### Phase 2D-4: WebSocket
- [ ] Fix `handleConnection` auto-join logic
- [ ] Add `USER_STATUS_CHANGED` event
- [ ] Add `USER_LEFT_AREA` / `USER_ENTERED_AREA` events
- [ ] Enhance `USER_LOCATION` event with new fields
- [ ] Integrate event emission in StatusCalculatorService

---

**Last Updated:** 2026-03-03
