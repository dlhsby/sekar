# Phase 2C: Backend Requirements

**Last Updated:** 2026-02-16
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)
**See also:** [Seeder Updates](./seeder-updates.md) for test data implementation

---

## Current Codebase Facts (Verified)

> Cross-reference with [database.md](./database.md) for complete schema facts.

| Entity/File | Key Facts |
|-------------|-----------|
| `UserRole` enum | 7 values: WORKER, SUPERVISOR, ADMIN, TOP_MANAGEMENT, KEPALA_RAYON, KOORDINATOR_LAPANGAN, LINMAS |
| `User` entity | Has `rayon_id` (nullable). **NO `area_id`** — must be added. |
| `ActivityType` entity | Uses `applicable_roles: string[]` (TEXT array). Current seeds use PascalCase: `['Worker']` |
| `Report` entity (class name) | `Report` class, table `work_reports`. Has `worker_id` (NOT `user_id`). `shift_id` is NOT NULL. |
| `Task` entity | `area_id` is NOT NULL (must become nullable). Has `activity_type_id`, `priority`, `decline_reason`, `accepted_at`, `declined_at` |
| `TaskStatus` | 6 values: pending, assigned, accepted, in_progress, completed, declined |
| `ClockInDto` | `area_id` is REQUIRED (UUID). Must become optional for auto-detect. |
| `CompleteTaskDto` | `gps_lat` and `gps_lng` are REQUIRED (@IsNotEmpty). `completion_photo_url` and `completion_notes` are OPTIONAL. |
| `WorkerSchedule` | Uses `user_id` and `effective_date` (NOT `worker_id` / `start_date`) |
| Shift entity | Uses `worker_id` column name — **RENAME to `user_id`** |

---

## Module Changes Overview

| Current Module | New Module | Change Type | Description |
|---------------|------------|------------|-------------|
| `users/` | `users/` | Modify | 8-role enum, `area_id`, role groups |
| `shifts/` | `shifts/` | Modify | `worker_id`→`user_id`, expand clockable roles, polygon geofencing |
| `reports/` | **`activities/`** | **Rename + Modify** | Multi-photo, mandatory activity_type, no review, English naming |
| `worker-schedules/` | **`schedules/`** | **Rename** | Remove "worker" prefix |
| `worker-assignments/` | — | **DELETE** | Fully deprecated, replaced by `schedules` |
| `tasks/` | `tasks/` | Modify | Hierarchy, tagging, simplified completion + status |
| `overtime/` | `overtime/` | Modify | **Flatten** — drop `OvertimeAktivitas`, merge into `Overtime` |
| `monitoring/` | `monitoring/` | Modify | Updated role access, scope auth, boundary warnings |
| `activity-types/` | `activity-types/` | Modify | New seed data, `applicable_roles` lowercase |

---

## A. Users Module

### UserRole Enum Update

**File:** `be/src/modules/users/entities/user.entity.ts`

**Target enum:**
```typescript
export enum UserRole {
  SATGAS = 'satgas',
  LINMAS = 'linmas',
  KORLAP = 'korlap',
  ADMIN_DATA = 'admin_data',
  KEPALA_RAYON = 'kepala_rayon',
  TOP_MANAGEMENT = 'top_management',
  ADMIN_SYSTEM = 'admin_system',
  SUPERADMIN = 'superadmin',
}
```

### User Entity - Add area_id

Add after the `rayon_id` property:

```typescript
@Column({ type: 'uuid', nullable: true })
area_id?: string;

@ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'area_id' })
area?: Area;
```

### Role Group Constants

**File:** `be/src/modules/users/constants/role-groups.ts`

```typescript
import { UserRole } from '../entities/user.entity';

export const CLOCKABLE_ROLES = [
  UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP,
  UserRole.ADMIN_DATA, UserRole.KEPALA_RAYON,
];

export const ACTIVITY_SUBMITTERS = [
  UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_DATA,
];

export const TASK_CREATORS = [
  UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN,
];

export const TASK_RECEIVERS = [
  UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.KEPALA_RAYON,
];

export const OVERTIME_SUBMITTERS = [UserRole.SATGAS, UserRole.LINMAS];
export const OVERTIME_APPROVERS = [UserRole.KORLAP];

export const MONITORING_CITY = [
  UserRole.TOP_MANAGEMENT, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN,
];
export const MONITORING_RAYON = [
  UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA, ...MONITORING_CITY,
];
export const MONITORING_AREA = [UserRole.KORLAP, ...MONITORING_RAYON];

export const USER_MANAGERS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

export const VALID_TASK_ASSIGNMENTS: Record<string, string[]> = {
  [UserRole.TOP_MANAGEMENT]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.ADMIN_SYSTEM]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.SUPERADMIN]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
};
```

> **NOTE:** `AKTIVITAS_SUBMITTERS` renamed to `ACTIVITY_SUBMITTERS` (English-only in code).

### Guards Update - Complete @Roles Mapping

| Controller File | Method | Current @Roles | Target @Roles |
|----------------|--------|----------------|---------------|
| `shifts.controller.ts` | clockIn/Out | `UserRole.WORKER` | `...CLOCKABLE_ROLES` |
| `shifts.controller.ts` | getActiveShifts | `ADMIN, SUPERVISOR` | `...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON` |
| `activities.controller.ts` | create | `UserRole.WORKER` | `...ACTIVITY_SUBMITTERS` |
| `activities.controller.ts` | getMyActivities | `UserRole.WORKER` | `...ACTIVITY_SUBMITTERS` |
| `activities.controller.ts` | findAll | `ADMIN, SUPERVISOR` | `...MONITORING_AREA` |
| `tasks.controller.ts` | create | `ADMIN, KEPALA_RAYON, KOORDINATOR_LAPANGAN` | `...TASK_CREATORS` |
| `tasks.controller.ts` | myTasks | `WORKER, LINMAS` | `...TASK_RECEIVERS` |
| `tasks.controller.ts` | complete | `WORKER, LINMAS` | `...TASK_RECEIVERS` |
| `monitoring.controller.ts` | getCityStats | `ADMIN, TOP_MANAGEMENT` | `...MONITORING_CITY` |
| `monitoring.controller.ts` | getRayonStats | `+KEPALA_RAYON` | `...MONITORING_RAYON` |
| `monitoring.controller.ts` | getAreaStats | `+SUPERVISOR` | `...MONITORING_AREA` |
| `monitoring.controller.ts` | getLiveUsers | `+SUPERVISOR` | `...MONITORING_AREA` |
| `users.controller.ts` | CRUD | `ADMIN` | `...USER_MANAGERS` |
| `overtime.controller.ts` | submit | `SATGAS, LINMAS` | `...OVERTIME_SUBMITTERS` |
| `overtime.controller.ts` | approve/reject | `KORLAP` | `...OVERTIME_APPROVERS` |

---

## B. Shifts Module

### Entity Changes

**File:** `be/src/modules/shifts/entities/shift.entity.ts`

- **Rename column:** `worker_id` → `user_id`
- **Rename relation:** `worker` → `user`
- **Add columns:** `clock_in_outside_boundary` (BOOLEAN, default false), `clock_out_outside_boundary` (BOOLEAN, default false)

### ClockInDto Transformation

**File:** `be/src/modules/shifts/dto/clock-in.dto.ts`

```typescript
export class ClockInDto {
  @IsUUID()
  @IsOptional()  // Was REQUIRED — now auto-detected from Schedule
  area_id?: string;

  @IsNumber() @Min(-90) @Max(90)
  gps_lat: number;

  @IsNumber() @Min(-180) @Max(180)
  gps_lng: number;

  @IsString() @MaxLength(10_000_000)
  @Matches(/^data:image\/(jpeg|jpg|png);base64,.../)
  selfie_photo: string;
}
```

### Area Auto-Detection (Updated for Terminology)

```typescript
async getActiveArea(userId: string): Promise<Area | null> {
  const today = new Date();

  // Check today's Schedule (PRIMARY source — renamed from WorkerSchedule)
  const schedule = await this.scheduleRepo.findOne({
    where: {
      user_id: userId,
      effective_date: LessThanOrEqual(today),
      end_date: Or(IsNull(), MoreThanOrEqual(today)),
    },
    relations: ['area'],
    order: { effective_date: 'DESC' },
  });
  if (schedule) return schedule.area;

  // No area assigned - allow clock-in with null area
  return null;
}
```

> **NOTE:** `WorkerAssignment` fallback REMOVED (table dropped). Only `Schedule` is checked.

### Polygon Geofencing (Soft Warning)

**New file:** `be/src/common/utils/gps.util.ts` — add methods:

```typescript
/**
 * Ray casting algorithm — checks if point is inside a GeoJSON polygon.
 * No PostGIS needed, runs in application layer.
 */
static isPointInPolygon(lat: number, lng: number, polygon: GeoJSON.Polygon): boolean {
  const coords = polygon.coordinates[0]; // outer ring
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][1], yi = coords[i][0]; // lat, lng
    const xj = coords[j][1], yj = coords[j][0];
    const intersect = ((yi > lng) !== (yj > lng))
      && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if GPS coords are within an area's boundary.
 * Priority: polygon (from KMZ) → radius fallback → true (no boundary defined)
 */
static isWithinAreaBoundary(lat: number, lng: number, area: Area): boolean {
  // 1. Polygon check (from areas.boundary_polygon JSONB)
  if (area.boundary_polygon) {
    return GpsUtil.isPointInPolygon(lat, lng, area.boundary_polygon);
  }
  // 2. Radius fallback (from area center + radius_meters)
  if (area.gps_lat && area.gps_lng && area.radius_meters) {
    const distance = GpsUtil.calculateDistance(lat, lng, area.gps_lat, area.gps_lng);
    return distance <= area.radius_meters;
  }
  // 3. No boundary defined — not flagged
  return true;
}
```

### clockIn() Integration

```typescript
async clockIn(userId: string, dto: ClockInDto): Promise<Shift> {
  // 1. Check if user already has active shift
  const existingShift = await this.getActiveShift(userId);
  if (existingShift) throw new ConflictException('Already clocked in');

  // 2. Determine area (auto-detect or from DTO)
  let area: Area | null;
  if (dto.area_id) {
    area = await this.areasService.findOne(dto.area_id);
  } else {
    area = await this.getActiveArea(userId);
  }

  // 3. Polygon geofencing (soft warning — never blocks)
  let outsideBoundary = false;
  if (area && dto.gps_lat && dto.gps_lng) {
    outsideBoundary = !GpsUtil.isWithinAreaBoundary(dto.gps_lat, dto.gps_lng, area);
  }

  // 4. Upload selfie to S3
  const selfieUrl = await this.s3Service.uploadBase64(dto.selfie_photo, ...);

  // 5. Create shift record
  return this.shiftRepo.save({
    user_id: userId,                      // RENAMED from worker_id
    area_id: area?.id ?? null,
    clock_in_time: new Date(),
    clock_in_photo: selfieUrl,
    gps_lat: dto.gps_lat,
    gps_lng: dto.gps_lng,
    clock_in_outside_boundary: outsideBoundary,  // NEW
  });
}
```

Same logic for `clockOut()` → sets `clock_out_outside_boundary`.

### ShiftsService Changes (Remove WorkerAssignment fallback)

- Remove `@InjectRepository(WorkerAssignment)` from constructor
- Remove `WorkerAssignmentsService` import
- `getActiveArea()` only checks `Schedule` (renamed from `WorkerSchedule`)
- Remove `WorkerAssignment` from `shifts.module.ts` TypeORM imports

---

## C. Activities Module (formerly Reports)

### Module Rename

| Current | New |
|---------|-----|
| `be/src/modules/reports/` | `be/src/modules/activities/` |
| `ReportsModule` | `ActivitiesModule` |
| `ReportsService` | `ActivitiesService` |
| `ReportsController` | `ActivitiesController` |
| `Report` entity class | `Activity` entity class |
| Table name `work_reports` | Table name `activities` |

### Route Renaming

| Current Route | New Route | Method |
|--------------|-----------|--------|
| `POST /reports` | `POST /activities` | Create activity |
| `GET /reports` | `GET /activities` | List activities |
| `GET /reports/:id` | `GET /activities/:id` | Get activity detail |
| `GET /reports/my` | `GET /activities/my` | My activities |

### Entity Changes

**File:** `be/src/modules/activities/entities/activity.entity.ts` (renamed from `report.entity.ts`)

- **Rename class:** `Report` → `Activity`
- **Table name:** `activities` (was `work_reports`)
- **Rename column:** `worker_id` → `user_id`
- **Rename relation:** `worker` → `user`
- **Drop column:** `report_type` (enum removed entirely)
- **Drop columns:** `is_reviewed`, `reviewed_by`, `reviewed_at`, `reviewer` relation
- **Drop column:** `condition` (ReportCondition enum)
- **Add column:** `photo_urls: string[]` (TEXT array, default `'{}'`)
- **Make required:** `activity_type_id` (was nullable)

### CreateActivityDto (renamed from CreateAktivitasDto)

```typescript
export class CreateActivityDto {
  @IsUUID()
  @IsNotEmpty()
  activity_type_id: string;  // REQUIRED

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsArray()
  @ArrayMaxSize(3)
  @ArrayMinSize(1)
  @IsString({ each: true })
  photo_urls: string[];  // S3 URLs (max 3)

  @IsNumber() @IsOptional()
  gps_lat?: number;

  @IsNumber() @IsOptional()
  gps_lng?: number;
}
```

### DTO Rename Summary

| Current | New |
|---------|-----|
| `CreateAktivitasDto` | `CreateActivityDto` |
| `CreateReportDto` | _(replaced by CreateActivityDto)_ |
| `UpdateReportDto` | `UpdateActivityDto` |
| `ReportsFilterDto` | `ActivitiesFilterDto` |

### Service Changes

```typescript
async createActivity(userId: string, dto: CreateActivityDto): Promise<Activity> {
  // 1. Verify user has active shift
  const activeShift = await this.shiftsService.getActiveShift(userId);
  if (!activeShift) {
    throw new BadRequestException('Harus clock-in terlebih dahulu');
  }

  // 2. Verify activity_type matches user's role
  const user = await this.usersService.findOne(userId);
  const activityType = await this.activityTypesService.findOne(dto.activity_type_id);
  if (!activityType.applicable_roles.includes(user.role)) {
    throw new BadRequestException('Jenis aktivitas tidak sesuai dengan role Anda');
  }

  // 3. Create activity
  return this.activityRepo.save({
    activity_type_id: dto.activity_type_id,
    description: dto.description,
    photo_urls: dto.photo_urls,
    gps_lat: dto.gps_lat,
    gps_lng: dto.gps_lng,
    user_id: userId,           // RENAMED from worker_id
    shift_id: activeShift.id,
    area_id: activeShift.area_id,
  });
}
```

### Access Control

| Action | Roles | Scope |
|--------|-------|-------|
| Create activity | ACTIVITY_SUBMITTERS | Must have active shift |
| View own activities | ACTIVITY_SUBMITTERS | `user_id = currentUser.id` |
| View all activities | MONITORING_AREA | korlap: own area, kepala_rayon: own rayon, admin: all |

---

## D. Schedules Module (formerly WorkerSchedules)

### Module Rename

| Current | New |
|---------|-----|
| `be/src/modules/worker-schedules/` | `be/src/modules/schedules/` |
| `WorkerSchedulesModule` | `SchedulesModule` |
| `WorkerSchedulesService` | `SchedulesService` |
| `WorkerSchedulesController` | `SchedulesController` |
| `WorkerSchedule` entity class | `Schedule` entity class |
| Table name `worker_schedules` | Table name `schedules` |

### Route Renaming

| Current Route | New Route |
|--------------|-----------|
| `GET /worker-schedules` | `GET /schedules` |
| `POST /worker-schedules` | `POST /schedules` |
| `PATCH /worker-schedules/:id` | `PATCH /schedules/:id` |
| `DELETE /worker-schedules/:id` | `DELETE /schedules/:id` |

### DTO Renames

| Current | New |
|---------|-----|
| `CreateWorkerScheduleDto` | `CreateScheduleDto` |
| `UpdateWorkerScheduleDto` | `UpdateScheduleDto` |

---

## E. Worker Assignments Module — DELETE

The `worker-assignments/` module is **deleted entirely**:

- Delete directory `be/src/modules/worker-assignments/`
- Remove `WorkerAssignmentsModule` from `app.module.ts` imports
- Remove `WorkerAssignment` entity from TypeORM `entities` array
- Remove all `WorkerAssignment` references from `shifts.module.ts` and `shifts.service.ts`
- Delete `AssignWorkerDto`
- Delete test files

---

## F. Tasks Module

### TaskStatus Simplification

**Target (4 statuses):**
```typescript
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}
```

**Removed:** `ACCEPTED`, `DECLINED`

### Task Entity Changes

- **Drop columns:** `activity_type_id`, `completion_gps_lat`, `completion_gps_lng`, `decline_reason`, `declined_at`, `accepted_at`
- **Add column:** `rayon_id` (nullable UUID FK → rayons)
- **Change:** `area_id` from NOT NULL to nullable
- **Add relation:** `tags: TaskTag[]` (OneToMany)

### CreateTaskDto

```typescript
export class CreateTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsOptional()
  description?: string;

  @IsUUID() @IsOptional()
  assigned_to?: string;

  @IsUUID() @IsOptional()
  area_id?: string;     // NOW OPTIONAL

  @IsUUID() @IsOptional()
  rayon_id?: string;    // NEW

  @IsDateString() @IsOptional()
  deadline?: string;

  @IsEnum(TaskPriority) @IsOptional()
  priority?: TaskPriority;

  @IsArray() @IsUUID('4', { each: true }) @IsOptional()
  tagged_user_ids?: string[];  // NEW: CC-like tagging
}
```

### CompleteTaskDto

```typescript
export class CompleteTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(2000)
  description: string;            // REQUIRED

  @IsString() @IsNotEmpty() @MaxLength(500)
  completion_photo_url: string;   // REQUIRED (was optional)

  // GPS fields REMOVED
}
```

### Hierarchical Assignment Validation

```typescript
async createTask(creatorId: string, dto: CreateTaskDto): Promise<Task> {
  const creator = await this.usersService.findOne(creatorId);
  const assignee = await this.usersService.findOne(dto.assigned_to);

  const allowedTargets = VALID_TASK_ASSIGNMENTS[creator.role] || [];
  if (!allowedTargets.includes(assignee.role)) {
    throw new ForbiddenException(
      `Role ${creator.role} tidak dapat menugaskan ke ${assignee.role}`
    );
  }

  // Scope validation: kepala_rayon within own rayon
  if (creator.role === UserRole.KEPALA_RAYON && creator.rayon_id) {
    if (dto.area_id) {
      const area = await this.areasService.findOne(dto.area_id);
      if (area.rayon_id !== creator.rayon_id) {
        throw new ForbiddenException('Anda hanya dapat menugaskan di rayon Anda');
      }
    }
  }

  // Scope validation: korlap within own area
  if (creator.role === UserRole.KORLAP && creator.area_id) {
    if (dto.area_id && dto.area_id !== creator.area_id) {
      throw new ForbiddenException('Anda hanya dapat menugaskan di area Anda');
    }
  }

  const task = await this.taskRepo.save({
    ...dto, created_by: creatorId,
    status: TaskStatus.PENDING, assigned_at: new Date(),
  });

  if (dto.tagged_user_ids?.length) {
    await this.addTags(task.id, dto.tagged_user_ids);
  }
  return task;
}
```

### Task Tagging Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/tasks/tagged` | Tasks where I'm tagged | All authenticated |
| `POST` | `/tasks/:id/tag` | Add tagged users | Task creator only |
| `DELETE` | `/tasks/:id/tag/:userId` | Remove tag | Task creator only |

**POST `/tasks/:id/tag` request body:**
```typescript
{
  user_ids: string[];  // Array of user UUIDs to tag
}
```

---

## G. Overtime Module (Flattened)

### Module Structure (Updated)

```
be/src/modules/overtime/
├── overtime.module.ts
├── overtime.controller.ts
├── overtime.service.ts
├── entities/
│   └── overtime.entity.ts       ← ONLY entity (overtime-aktivitas.entity.ts DELETED)
└── dto/
    ├── create-overtime.dto.ts   ← FLAT (no nested aktivitas array)
    └── approve-overtime.dto.ts
```

### Entity: Overtime (Flat — activity fields inline)

```typescript
@Entity('overtimes')
export class Overtime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  area_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Activity fields (FLAT — merged from overtime_aktivitas)
  @Column({ type: 'uuid', nullable: true })
  activity_type_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photo_urls: string[];

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gps_lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  gps_lng: number;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @ManyToOne(() => ActivityType, { nullable: true })
  @JoinColumn({ name: 'activity_type_id' })
  activityType: ActivityType;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

> **DELETED:** `OvertimeAktivitas` entity and `overtime_aktivitas` table.

### CreateOvertimeDto (FLAT — no nested array)

```typescript
export class CreateOvertimeDto {
  @IsDateString() @IsNotEmpty()
  date: string;

  @IsString() @Matches(/^\d{2}:\d{2}$/)
  start_time: string;

  @IsString() @Matches(/^\d{2}:\d{2}$/)
  end_time: string;

  @IsString() @IsOptional()
  notes?: string;

  // Activity fields (inline — 1 overtime = 1 activity)
  @IsUUID() @IsNotEmpty()
  activity_type_id: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsArray() @ArrayMaxSize(3) @ArrayMinSize(1)
  @IsString({ each: true })
  photo_urls: string[];

  @IsNumber() @IsOptional()
  gps_lat?: number;

  @IsNumber() @IsOptional()
  gps_lng?: number;
}
```

### API Response (Flat)

```json
{
  "id": "uuid",
  "date": "2026-02-10",
  "start_time": "17:00",
  "end_time": "20:00",
  "status": "pending",
  "activity_type_id": "uuid",
  "activityType": { "id": "uuid", "name": "Penyiraman", "code": "penyiraman" },
  "description": "Extra watering after shift",
  "photo_urls": ["https://..."],
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "notes": null,
  "created_at": "2026-02-10T17:00:00Z"
}
```

### Overtime Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST` | `/overtime` | Submit overtime request | OVERTIME_SUBMITTERS |
| `GET` | `/overtime/my` | My overtime requests | OVERTIME_SUBMITTERS |
| `GET` | `/overtime` | Pending approvals | OVERTIME_APPROVERS |
| `GET` | `/overtime/:id` | Overtime detail | Owner + managers |
| `PATCH` | `/overtime/:id/approve` | Approve overtime | OVERTIME_APPROVERS |
| `PATCH` | `/overtime/:id/reject` | Reject overtime | OVERTIME_APPROVERS |

### Service Logic (Updated for flat structure)

```typescript
async submitOvertime(userId: string, dto: CreateOvertimeDto): Promise<Overtime> {
  const user = await this.usersService.findOne(userId);

  if (!OVERTIME_SUBMITTERS.includes(user.role as UserRole)) {
    throw new ForbiddenException('Hanya satgas dan linmas yang dapat mengajukan lembur');
  }

  // Validate activity type matches user's role
  const actType = await this.activityTypesService.findOne(dto.activity_type_id);
  if (!actType.applicable_roles.includes(user.role)) {
    throw new BadRequestException('Jenis aktivitas tidak sesuai role');
  }

  const area = await this.shiftsService.getActiveArea(userId);

  return this.overtimeRepo.save({
    user_id: userId,
    area_id: area?.id ?? null,
    ...dto,  // Flat — activity fields directly on overtime
  });
}
```

---

## H. Monitoring Module

### Updated Role Access with Authorization

```typescript
// City monitoring
@Roles(...MONITORING_CITY)
@Get('city')
async getCityStats() { ... }

// Rayon monitoring — with scope authorization
@Roles(...MONITORING_RAYON)
@Get('rayon/:rayonId')
async getRayonStats(@Param('rayonId') rayonId: string, @GetUser() user: User) {
  if (user.role === UserRole.KEPALA_RAYON && user.rayon_id !== rayonId) {
    throw new ForbiddenException('Anda hanya dapat melihat monitoring rayon Anda');
  }
  return this.monitoringService.getRayonStats(rayonId);
}

// Area monitoring — with scope authorization
@Roles(...MONITORING_AREA)
@Get('area/:areaId')
async getAreaStats(@Param('areaId') areaId: string, @GetUser() user: User) {
  if (user.role === UserRole.KORLAP && user.area_id !== areaId) {
    throw new ForbiddenException('Anda hanya dapat melihat monitoring area Anda');
  }
  return this.monitoringService.getAreaStats(areaId);
}
```

### getLiveUsers (renamed from getLiveWorkers)

- Endpoint renamed: method name `getLiveWorkers` → `getLiveUsers`
- Response includes `outside_boundary: boolean` per user for geofencing warnings
- Dashboard shows warning indicator (yellow/red icon) for out-of-boundary users

### Monitoring Service Updates

- Remove `TaskStatus.ACCEPTED` from active tasks filter array
- Replace `worker_id` references with `user_id` in queries

---

## I. Activity Types Module

### Service Update

```typescript
async findByRole(role: string): Promise<ActivityType[]> {
  return this.repo.createQueryBuilder('at')
    .where(':role = ANY(at.applicable_roles)', { role })
    .andWhere('at.is_active = true')
    .andWhere('at.deleted_at IS NULL')
    .getMany();
}
```

---

## J. Error Code Updates

| Current Code | New Code |
|-------------|----------|
| `REPORT_NOT_FOUND` | `ACTIVITY_NOT_FOUND` |
| `REPORT_ACCESS_DENIED` | `ACTIVITY_ACCESS_DENIED` |
| Any `REPORT_*` | `ACTIVITY_*` |
| Any `AKTIVITAS_*` | `ACTIVITY_*` |

### Error Codes (Phase 2C)

| Code | HTTP | Message |
|------|------|---------|
| `OVERTIME_001` | 403 | Hanya satgas dan linmas yang dapat mengajukan lembur |
| `OVERTIME_002` | 400 | Overtime sudah diproses |
| `OVERTIME_003` | 403 | Anda hanya dapat menyetujui lembur di area Anda |
| `OVERTIME_004` | 404 | Overtime tidak ditemukan |
| `TASK_HIER_001` | 403 | Role X tidak dapat menugaskan ke Y |
| `TASK_HIER_002` | 403 | Anda hanya dapat menugaskan di rayon Anda |
| `TASK_HIER_003` | 403 | Anda hanya dapat menugaskan di area Anda |
| `ACTIVITY_001` | 400 | Harus clock-in terlebih dahulu |
| `ACTIVITY_002` | 400 | Jenis aktivitas tidak sesuai dengan role Anda |
| `ACTIVITY_003` | 400 | Maksimal 3 foto per aktivitas |
| `ACTIVITY_004` | 400 | Minimal 1 foto per aktivitas |
| `MONITOR_001` | 403 | Anda hanya dapat melihat monitoring rayon Anda |
| `MONITOR_002` | 403 | Anda hanya dapat melihat monitoring area Anda |

---

## K. Seed Updates

### Phase 1 Seed Updates (`seed.service.ts`)

- Remove `seedWorkerAssignments()` (deprecated module)
- **Add `area_id` assignment for korlap users:** All korlap users (korlap1, korlap2) must have `area_id` populated. Added UPDATE query after user creation to assign them to Taman Bungkul.
- **Add boundary flag test data:** One completed shift updated with `clock_in_outside_boundary = true` to test monitoring dashboard polygon geofencing warnings.

### Phase 2 Seed Updates (`seed-phase2.ts`)

- Update table references: `worker_schedules` → `schedules`
- Update column references: `worker_id` → `user_id`
- **Add overtime test data:** 3 overtime records (PENDING, APPROVED, REJECTED) using flat structure with activity fields directly on overtime table (no nested `aktivitas` array).

### Task Seed Updates (`seed-tasks.ts`)

- **Add rayon-scoped tasks:** 2 tasks with `rayon_id` set and `area_id = NULL` to test kepala_rayon assignment workflows.
- All area-scoped tasks (8) maintain `area_id` populated, `rayon_id = NULL`.

---

## Endpoint Summary

### New Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST` | `/overtime` | Submit overtime | OVERTIME_SUBMITTERS |
| `GET` | `/overtime/my` | My overtime requests | OVERTIME_SUBMITTERS |
| `GET` | `/overtime` | Pending approvals | OVERTIME_APPROVERS |
| `GET` | `/overtime/:id` | Overtime detail | Owner + managers |
| `PATCH` | `/overtime/:id/approve` | Approve overtime | OVERTIME_APPROVERS |
| `PATCH` | `/overtime/:id/reject` | Reject overtime | OVERTIME_APPROVERS |
| `GET` | `/tasks/tagged` | Tasks where I'm tagged | All authenticated |
| `POST` | `/tasks/:id/tag` | Add tags to task | Task creator |
| `DELETE` | `/tasks/:id/tag/:userId` | Remove tag | Task creator |
| `POST` | `/uploads/photos` | Multi-photo upload | All authenticated |

### Renamed Endpoints

| Old Path | New Path | Change |
|----------|----------|--------|
| `/reports` | `/activities` | Module rename |
| `/reports/:id` | `/activities/:id` | Module rename |
| `/reports/my` | `/activities/my` | Module rename |
| `/worker-schedules` | `/schedules` | Module rename |

### Removed Endpoints

| Path | Reason |
|------|--------|
| `/workers/:id/assign` | `worker_assignments` dropped |
| `/tasks/:id/accept` | Accept workflow removed |
| `/tasks/:id/decline` | Decline workflow removed |

---

## Completed Work

### Terminology Cleanup (Feb 15, 2026)
- ✅ Removed all outdated "worker" and "supervisor" references in API docs, DTOs, and comments
- ✅ Updated DTO: `WorkerStatusDto` → `UserStatusDto`
- ✅ Updated field names: `workers` → `users`, `total_workers_assigned` → `total_users_assigned`
- ✅ Updated all JSDoc and comments to use Phase 2C terminology (satgas, korlap, user)
- ✅ Files modified: 9 files (users controller, area-stats DTO, main.ts, shifts, supervisor, monitoring, tasks)
- ✅ Tests: All 922 tests passing
- ⚠️ **Breaking Change:** API response field names changed in `/monitoring/areas/:id/stats` - mobile/web teams must update before backend deployment

---

## Implementation Sub-phases

| Sub-phase | Scope | Dependencies |
|-----------|-------|-------------|
| **A: Database Migration** | All migration scripts | None |
| **B: Entity + Module Renames** | `Report`→`Activity`, `WorkerSchedule`→`Schedule`, module dirs | A |
| **C: Column Renames** | `worker_id`→`user_id` on 3 entities | B |
| **D: Overtime Flatten** | Drop `OvertimeAktivitas`, merge into `Overtime` | B |
| **E: Polygon Geofencing** | `GpsUtil` methods, shifts integration, boundary flags | B |
| **F: Delete WorkerAssignments** | Remove module, update shifts service | B |
| **G: Seed Updates** | All seed files for new names | B, C, D |
| **H: Backend Tests** | Update all tests for new names + add geofencing tests | C, D, E, F |

---

**Last Updated:** 2026-02-16
