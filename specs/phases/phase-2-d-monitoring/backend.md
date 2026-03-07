# Phase 2D: Backend Requirements

**Last Updated:** 2026-03-07
**Status:** ✅ COMPLETE (Implementation + Review + Gap Fixes)
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM
**Related ADR:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-011](../../architecture/decisions/ADR-011-phase2d-monitoring-status-model.md)
**See also:** [Database Schema](./database.md), [README](./README.md)
**Tests:** 1,172 passing (62 suites, 91.81% stmt, 80.37% branch)

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
   * When clockInLat/clockInLng are provided and the area has a boundary,
   * computes is_within_area dynamically via checkWithinArea().
   * Otherwise defaults is_within_area to true.
   */
  async onClockIn(userId: string, shiftId: string, areaId: string | null, shiftDefinitionId: string | null, clockInLat?: number, clockInLng?: number): Promise<void>;

  /**
   * Update tracking status on clock-out event.
   */
  async onClockOut(userId: string): Promise<void>;

  /**
   * Update tracking status on location ping.
   * Also checks if status change crosses area staffing threshold
   * and emits AREA_STAFFING_CHANGED event if needed.
   */
  async onLocationPing(userId: string, latitude: number, longitude: number, accuracy: number | null, batteryLevel: number | null, loggedAt: Date): Promise<void>;

  /**
   * Emit AREA_STAFFING_CHANGED WebSocket event when a status transition
   * causes the area's active worker count to cross the staffing threshold.
   * Called from recalculate() and onLocationPing() when status changes.
   */
  private async emitStaffingChangedIfNeeded(areaId: string, previousStatus: TrackingStatus, newStatus: TrackingStatus, timestamp: Date): Promise<void>;
}
```

**Status calculation algorithm:**

```typescript
interface StatusInput {
  hasActiveShift: boolean;
  lastLocationAt: Date | null;
  isWithinArea: boolean;
}

interface StatusThresholds {
  active_max_age_seconds: number;     // default: 300
  inactive_threshold_seconds: number; // default: 900
  missing_threshold_seconds: number;  // default: 3600
}

function calculateStatus(input: StatusInput, thresholds: StatusThresholds, now: Date): TrackingStatus {
  // 1. No active shift → OFFLINE
  if (!input.hasActiveShift) {
    return TrackingStatus.OFFLINE;
  }

  // 2. No location data or older than missing_threshold → MISSING
  if (!input.lastLocationAt) {
    return TrackingStatus.MISSING;
  }

  const ageSeconds = (now.getTime() - input.lastLocationAt.getTime()) / 1000;

  if (ageSeconds > thresholds.missing_threshold_seconds) {
    return TrackingStatus.MISSING;
  }

  // 3. Location older than inactive_threshold → INACTIVE
  if (ageSeconds > thresholds.inactive_threshold_seconds) {
    return TrackingStatus.INACTIVE;
  }

  // 4. Outside assigned area → OUTSIDE_AREA
  if (!input.isWithinArea) {
    return TrackingStatus.OUTSIDE_AREA;
  }

  // 5. Otherwise → ACTIVE
  return TrackingStatus.ACTIVE;
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

  private readonly BATCH_SIZE = 50;

  /**
   * Every 60 seconds: find users with active/inactive/outside_area status
   * whose last_location_at is older than active_max_age_seconds.
   * Re-evaluate their status (may transition from active -> inactive -> missing).
   * Users are processed in batches of BATCH_SIZE (50) to limit memory and DB pressure.
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

### B5. MonitoringStatsService

**File:** `be/src/modules/monitoring/services/monitoring-stats.service.ts`

Extracted from `MonitoringService` during post-review refactoring. Provides aggregated status counts scoped by role hierarchy.

```typescript
@Injectable()
export class MonitoringStatsService {
  constructor(
    private readonly trackingStatusRepo: Repository<UserTrackingStatus>,
    private readonly areaRepo: Repository<Area>,
    private readonly staffRequirementRepo: Repository<AreaStaffRequirement>,
    private readonly dayTypeService: DayTypeService,
  ) {}

  /**
   * City-wide stats for top_management / superadmin / admin_system.
   * Aggregates all rayon stats into a single response.
   */
  async getCityStats(): Promise<CityStatsDto>;

  /**
   * Per-rayon aggregation for kepala_rayon.
   * Returns counts by status (active, inactive, outside_area, missing, offline)
   * for all areas within the specified rayon.
   */
  async getRayonStats(rayonId: string): Promise<RayonStatsDto>;

  /**
   * Per-area stats for korlap.
   * Returns counts by status (active, inactive, outside_area, missing, offline)
   * along with staff requirements filtered by current day_type.
   */
  async getAreaStats(areaId: string): Promise<AreaStatsDto>;
}
```

All three methods return counts broken down by status: `active`, `inactive`, `outside_area`, `missing`, `offline`.

### B6. MonitoringUserService

**File:** `be/src/modules/monitoring/services/monitoring-user.service.ts`

Extracted from `MonitoringService` during post-review refactoring. Provides user-level monitoring data.

```typescript
@Injectable()
export class MonitoringUserService {
  constructor(
    private readonly trackingStatusRepo: Repository<UserTrackingStatus>,
    private readonly locationLogRepo: Repository<LocationLog>,
    private readonly shiftRepo: Repository<Shift>,
    private readonly activityRepo: Repository<Activity>,
    private readonly taskRepo: Repository<Task>,
  ) {}

  /**
   * Returns active users with tracking status, scoped by the caller's role.
   * korlap sees own area; kepala_rayon sees own rayon; top_management sees all.
   */
  async getLiveUsers(scope: MonitoringScope): Promise<LiveUsersResponseDto>;

  /**
   * Daily aggregated data for a specific user (shift, activities, tasks, last location).
   * Used by the worker detail panel / modal on map marker click.
   */
  async getUserDaySummary(userId: string, date: Date): Promise<UserDaySummaryDto>;

  /**
   * GPS trail for a specific user on a specific date with analytics.
   * Returns location points plus computed metrics:
   * - total_distance_meters: sum of haversine distances between consecutive points
   * - time_inside_area_minutes: total time spent within assigned area boundary
   */
  async getUserLocationHistory(userId: string, date: Date): Promise<LocationHistoryResponseDto>;
}
```

---

## C. Modified Endpoints

### C1. `GET /monitoring/live-users` -- Enhanced

**Changes:**
- Response uses `user_tracking_status` table (single join query, replaces N+1)
- `is_within_area` now computed from GPS + boundary (not hardcoded)
- `shift_name` from `shift_definitions.name` join (not hardcoded)
- New `status` field with five-status model
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
    requirements_by_day_type: {
      weekday: number;
      weekend: number;
      holiday: number;
    };
  }[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

export class StaffingSummaryResponseDto {
  current_day_type: DayType;                    // NEW: resolved day type
  current_day_type_label: string;               // NEW: "Hari Kerja" | "Akhir Pekan" | "Hari Libur"
  items: StaffingSummaryItemDto[];
  generated_at: Date;
}
```

### D5a. Day-Type Resolution for Staffing Queries (NEW - Gap Fix)

**Problem:** `area_staff_requirements` table has `day_type: DayType` (WEEKDAY/WEEKEND/HOLIDAY) but current staffing queries do NOT filter by day_type, causing incorrect counts (all day types summed).

**Required utility:**

```typescript
/**
 * Resolve the current day type for a given date.
 * 1. Check special_day_overrides table for exact date match
 * 2. Fall back to day-of-week (Mon-Fri = WEEKDAY, Sat-Sun = WEEKEND)
 */
async getCurrentDayType(date?: Date): Promise<DayType> {
  const targetDate = date ?? new Date();

  // Check special_day_overrides first
  const override = await this.specialDayOverrideRepo.findOne({
    where: { date: targetDate },
  });
  if (override) return override.day_type;

  // Fall back to day-of-week
  const dayOfWeek = targetDate.getDay();
  return (dayOfWeek === 0 || dayOfWeek === 6) ? DayType.WEEKEND : DayType.WEEKDAY;
}
```

**Day-type caching strategy:** The resolved day-type is cached in-memory with a **5-minute TTL** to avoid repeated `special_day_overrides` table lookups on every staffing query. Cache is stored in `MonitoringCacheService` alongside threshold and boundary caches.

**All staffing queries MUST filter by current day_type:**
- `MonitoringService.buildStaffingItem()` — filter `area_staff_requirements` by resolved day_type
- `MonitoringStatsService.getAreaStaffRequirements()` — filter by resolved day_type
- `MonitoringStatsService.countRequiredWorkersByAreaIds()` — filter by resolved day_type

**Enhanced StaffingSummaryResponseDto** (add fields):

```typescript
export class StaffingSummaryResponseDto {
  items: StaffingSummaryItemDto[];
  current_day_type: DayType;                    // NEW: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'
  current_day_type_label: string;               // NEW: 'Hari Kerja' | 'Akhir Pekan' | 'Hari Libur'
  generated_at: Date;
}

// Each StaffingSummaryItemDto role entry also gets:
export interface StaffingRoleDto {
  // ... existing fields ...
  total_required: number;                       // NOW: uses requirement for current day_type only
  requirements_by_day_type: {                   // NEW: for comparison context
    weekday: number;
    weekend: number;
    holiday: number;
  };
}
```

**Enhanced AreaStatsDto** (add fields):
```typescript
export class AreaStatsDto {
  // ... existing fields ...
  current_day_type: DayType;                    // NEW
  current_day_type_label: string;               // NEW
}
```

### D6. `GET /monitoring/boundaries` (NEW)

Returns all rayon and area boundaries in a single call for map rendering.

**Auth:** `@Roles(...MONITORING_AREA)` with scope check

```typescript
// Hierarchical structure: rayons contain their child areas
export class BoundariesResponseDto {
  rayons: RayonBoundaryDto[];
  generated_at: Date;
}

export class RayonBoundaryDto {
  id: string;
  name: string;
  code: string;
  boundary_polygon: GeoJsonPolygon | null;      // Auto-computed convex hull of child areas
  center_lat: number | null;                     // Centroid or manual override (rayon office)
  center_lng: number | null;
  area_count: number;
  is_understaffed: boolean;                      // Any child area understaffed
  understaffed_area_count: number;
  areas: AreaBoundaryDto[];                      // Child areas nested within rayon
}

export class RoleStaffingItemDto {
  role: string;                                  // 'satgas' | 'linmas' | 'korlap'
  required: number;
  active: number;
}

export class AreaBoundaryDto {
  id: string;
  name: string;
  rayon_id: string;
  rayon_name: string;
  boundary_polygon: GeoJsonPolygon | null;
  center_lat: number;                            // Area GPS center
  center_lng: number;
  radius_meters: number;
  assigned_count: number;
  is_understaffed: boolean;
  staffing_summary: RoleStaffingItemDto[];       // Per-role staffing for center marker tap
}
```

**Caching:** Rayon boundaries cached with 5-min TTL in `MonitoringCacheService`.

**Rayon boundary auto-computation (convex hull algorithm):**
- When an area's boundary_polygon changes (via `PUT /areas/:id/boundary`), recompute the parent rayon's boundary as the convex hull of all child area polygons
- Algorithm: collect all exterior ring vertices from constituent area polygons, then compute the convex hull using Graham scan or gift-wrapping. The result is a single GeoJSON Polygon encompassing all child areas.
- Center position defaults to centroid of the convex hull but is manually overridable (for rayon office location)
- Hook into area CRUD: `AreasService.updateBoundary()` -> `RayonBoundaryService.recompute(rayonId)` ✅ **WIRED** (via `@Optional() @Inject(RayonBoundaryService)` in AreasService, using `forwardRef(() => MonitoringModule)` to resolve circular dependency)
- Recomputed rayon boundary is cached with 5-min TTL in `MonitoringCacheService`; cache is invalidated on any child area boundary update

### D7. `POST /monitoring/reassign` (NEW)

Reassign a worker from one area to another. Used by supervisors to move workers from overstaffed/nearby areas to understaffed areas.

**Auth:** `@Roles('superadmin', 'admin_system', 'kepala_rayon')`
**Scope:** `kepala_rayon` can only reassign within own rayon

```typescript
export class ReassignWorkerDto {
  @IsUUID()
  user_id: string;                              // Worker to reassign

  @IsUUID()
  target_area_id: string;                       // New area

  @IsUUID()
  @IsOptional()
  shift_definition_id?: string;                 // Defaults to current

  @IsDateString()
  @IsOptional()
  effective_date?: string;                      // Defaults to today

  @IsBoolean()
  @IsOptional()
  end_current_schedule?: boolean;               // Default true

  @IsString()
  @IsOptional()
  reason?: string;                              // Audit trail
}

export class ReassignWorkerResponseDto {
  user_id: string;
  user_name: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  new_schedule_id: string | null;               // Non-null when shift_definition_id provided
  effective_date: string;                        // Defaults to today if not specified
  reassigned_at: Date;
}
```

**Backend logic:**
1. Validate permission (kepala_rayon can only reassign within own rayon)
2. Verify target area exists and worker has compatible role
3. End current active schedules for old area if `end_current_schedule = true` (sets `end_date` to effective date)
4. Create new Schedule record for target area when `shift_definition_id` is provided
5. Update `user.area_id` and `user_tracking_status.area_id` to target area
6. Send push notification to worker (optional, if FCM enabled — TODO)
7. Emit WebSocket `USER_REASSIGNED` event to old/new area rooms, rayon rooms, and city room

**Error responses:**
- `403 Forbidden` — kepala_rayon trying to reassign outside own rayon
- `404 Not Found` — user or target area not found
- `409 Conflict` — worker already assigned to target area
- `422 Unprocessable Entity` — worker role not compatible with area requirements

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
  client.join('monitoring:city');
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
    client.join('monitoring:city');
  }

  if ([UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA].includes(role)) {
    const user = await this.userService.findById(userId);
    if (user?.rayon_id) {
      client.join(`monitoring:rayon:${user.rayon_id}`);
    }
  }

  if (role === UserRole.KORLAP) {
    const user = await this.userService.findById(userId);
    if (user?.area_id) {
      client.join(`monitoring:area:${user.area_id}`);
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
  USER_REASSIGNED = 'user:reassigned',
  AREA_STAFFING_CHANGED = 'area:staffing-changed',  // NEW (Gap Fix)
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

export class AreaStaffingChangedEvent {
  area_id: string;
  rayon_id: string | null;
  active_count: number;
  required_count: number;
  is_met: boolean;
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

// Check if staffing threshold crossed (Gap Fix)
if (statusChanged && areaId) {
  await this.emitStaffingChangedIfNeeded(areaId, oldStatus, newStatus, new Date());
}
```

### E5. WebSocket Room Broadcasting Logic

Events are broadcast to hierarchical rooms so each role receives only relevant updates.

**Room structure:**
- `monitoring:city` — receives all status changes, boundary events, and reassignments (for top_management, admin_system, superadmin)
- `monitoring:rayon:{id}` — receives events for users within the rayon (for kepala_rayon, admin_data)
- `monitoring:area:{id}` — receives events for users within the area (for korlap)

**Broadcasting rules:**

1. **On status change** (`USER_STATUS_CHANGED`): emit to `monitoring:area:{areaId}`, `monitoring:rayon:{rayonId}`, and `monitoring:city`.
2. **On boundary event** (`USER_LEFT_AREA` / `USER_ENTERED_AREA`): emit to `monitoring:area:{areaId}`, `monitoring:rayon:{rayonId}`, and `monitoring:city`.
3. **On reassignment** (`USER_REASSIGNED`): emit to **both** the old area room (`monitoring:area:{previousAreaId}`) and the new area room (`monitoring:area:{newAreaId}`), plus both parent rayon rooms and `monitoring:city`.
4. **On location update** (`USER_LOCATION`): emit to `monitoring:area:{areaId}` and `monitoring:rayon:{rayonId}` only (city room does not receive high-frequency location pings to reduce bandwidth).
5. **On staffing threshold crossing** (`AREA_STAFFING_CHANGED`): emit to `monitoring:area:{areaId}`, `monitoring:rayon:{rayonId}`, and `monitoring:city`. Triggered when any status change causes the area's active worker count to cross above or below the required staffing threshold.

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

  // NEW: Update tracking status (passes GPS coords for boundary check)
  await this.statusCalculator.onClockIn(userId, saved.id, area?.id ?? null, shiftDefinition?.id ?? null, dto.gps_lat, dto.gps_lng);

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
    monitoring-stats.service.ts                 NEW (extracted from MonitoringService)
    monitoring-user.service.ts                  NEW (extracted from MonitoringService)
    monitoring-reassign.service.ts              NEW (Gap Fix: worker reassignment with schedule mgmt)
    day-type.service.ts                         NEW (Gap Fix: day-type resolution with cache)
    rayon-boundary.service.ts                   NEW (Gap Fix: convex hull boundary computation)
    monitoring.service.ts                       MODIFIED (slimmed to 220 lines)
  dto/
    live-users.dto.ts                           MODIFIED
    area-stats.dto.ts                           MODIFIED
    location-history.dto.ts                     NEW
    user-day-summary.dto.ts                     NEW
    monitoring-config.dto.ts                    NEW
    area-boundary.dto.ts                        NEW
    staffing-summary.dto.ts                     NEW
    boundaries.dto.ts                           NEW (Gap Fix: rayon + area boundaries)
    reassign-worker.dto.ts                      NEW (Gap Fix: reassign request/response)
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
| GET | `/monitoring/live-users` | korlap+ | Enhanced | Five-status, computed fields |
| GET | `/monitoring/users/:userId/location-history` | korlap+ | **NEW** | GPS trail for playback |
| GET | `/monitoring/users/:userId/day-summary` | korlap+ | **NEW** | Detail modal data |
| GET | `/monitoring/config` | admin_system+ | **NEW** | List config values |
| PATCH | `/monitoring/config/:key` | admin_system+ | **NEW** | Update config |
| GET | `/monitoring/staffing-summary` | korlap+ | **NEW** | Filter modal data |
| GET | `/areas/:id/boundary` | admin_system+ | **NEW** | Get area polygon |
| PUT | `/areas/:id/boundary` | admin_system+ | **NEW** | Update area polygon |
| GET | `/monitoring/boundaries` | korlap+ | **NEW** | All rayon + area boundaries |
| POST | `/monitoring/reassign` | admin_system+ | **NEW** | Reassign worker to new area |

**Total new endpoints:** 9
**Total modified endpoints:** 4

---

## K. Implementation Checklist

### Phase 2D-1: Foundation — ✅ COMPLETE
- [x] Create `MonitoringConfig` entity
- [x] Create `UserTrackingStatus` entity
- [x] Write database migration (tables, indexes)
- [x] Implement `StatusCalculatorService` with unit tests (16 tests)
- [x] Implement `MonitoringSchedulerService` with unit tests
- [x] Implement `MonitoringCacheService` with unit tests
- [x] Implement `MonitoringConfigService` with unit tests
- [x] Add `shift_definition_id` to Shift entity
- [x] Run backfill scripts

### Phase 2D-2: Fix Hardcodes — ✅ COMPLETE
- [x] Fix `is_within_area` computation in MonitoringService
- [x] Fix `shift_name` to use ShiftDefinition join
- [x] Fix WebSocket role checks (PascalCase -> lowercase)
- [x] Fix per-role staff requirement counting

### Phase 2D-3: New Endpoints — ✅ COMPLETE
- [x] Implement location history endpoint with tests
- [x] Implement user day summary endpoint with tests
- [x] Implement monitoring config CRUD with tests
- [x] Implement area boundary CRUD with tests (GeoJSON validator: 28 tests)
- [x] Implement staffing summary endpoint with tests
- [x] Add GeoJSON validator utility with tests

### Phase 2D-4: WebSocket — ✅ COMPLETE
- [x] Fix `handleConnection` auto-join logic
- [x] Add `USER_STATUS_CHANGED` event
- [x] Add `USER_LEFT_AREA` / `USER_ENTERED_AREA` events
- [x] Enhance `USER_LOCATION` event with new fields
- [x] Integrate event emission in StatusCalculatorService

### Post-Review Refactoring — ✅ COMPLETE
- [x] Fix data inconsistency: city/rayon stats now query `user_tracking_status`
- [x] Upgrade error logging: `.catch(() => {})` → `.catch(err => logger.error(...))`
- [x] Complete DTO barrel exports (5 missing exports added)
- [x] Refactor MonitoringService: split 1,136→220 lines (extracted MonitoringStatsService + MonitoringUserService)
- [x] Verify Postman collection (all 9 endpoints present)

### Phase 2D-10: Gap Fixes — ✅ COMPLETE (March 7, 2026)
- [x] Implement `DayTypeService` with `getCurrentDayType()` and special_day_overrides lookup
- [x] Fix all staffing queries to filter by current day_type
- [x] Add day_type fields to StaffingSummaryResponseDto and AreaStatsDto
- [x] Add rayon boundary columns to database (migration: `1741100000000-Phase2DGapFixes.ts`)
- [x] Implement `RayonBoundaryService` (convex hull computation)
- [x] Wire `RayonBoundaryService.recompute()` into `AreasService.updateBoundary()` (via `forwardRef`)
- [x] Implement `GET /monitoring/boundaries` endpoint with hierarchical response
- [x] Implement `POST /monitoring/reassign` endpoint with schedule management
- [x] Add `ReassignWorkerDto` (6 fields: user_id, target_area_id, shift_definition_id?, effective_date?, end_current_schedule?, reason?)
- [x] Add schedule creation and `endCurrentSchedules()` logic in MonitoringReassignService
- [x] Add WebSocket `USER_REASSIGNED` and `AREA_STAFFING_CHANGED` events
- [x] Fix `onClockIn()` to check boundary with GPS coordinates (was hardcoded `is_within_area: true`)
- [x] Emit `AREA_STAFFING_CHANGED` when status transitions cross staffing threshold
- [x] Update seed `cluster_zoom_threshold: 13` → `14`
- [x] Add 77 new tests (total: 1,172 tests, 62 suites)
- [x] Maintain >80% branch coverage (80.37%)

---

**Last Updated:** 2026-03-07
