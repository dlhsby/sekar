# Phase 2C: Backend Requirements

**Last Updated:** 2026-02-10
**Status:** Planning
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM

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
| Shift entity | Uses `worker_id` column name |

---

## Module Changes Overview

| Module | Change Type | Priority | Description |
|--------|------------|----------|-------------|
| Users | Modify | Critical | New UserRole enum (8 roles), add `area_id` to entity |
| Shifts | Modify | High | Remove GPS boundary, expand clockable roles to 5, update ClockInDto |
| Reports → Aktivitas | Rename + Modify | Critical | Multi-photo, mandatory activity_type, no review, correct applicable_roles check |
| Tasks | Modify | High | Hierarchical assignment, tagging, simplified completion + status, update CompleteTaskDto |
| Overtime | New | High | Full CRUD + approval workflow |
| Monitoring | Modify | Medium | Updated role access, add area-scope authorization for korlap |
| Activity Types | Modify | High | New seed data using `applicable_roles TEXT[]` for 4 roles |
| Worker Assignments | Modify | Medium | Deprecation, schedule reconciliation |

---

## A. Users Module

### UserRole Enum Update

**File:** `be/src/modules/users/entities/user.entity.ts`

**Current enum (line 14-22):**
```typescript
export enum UserRole {
  WORKER = 'worker',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  TOP_MANAGEMENT = 'top_management',
  KEPALA_RAYON = 'kepala_rayon',
  KOORDINATOR_LAPANGAN = 'koordinator_lapangan',
  LINMAS = 'linmas',
}
```

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

**File:** `be/src/modules/users/entities/user.entity.ts`

The User entity currently has `rayon_id` but **NO `area_id`**. Add after line 64:

```typescript
@ApiProperty({
  description: 'Area ID for Korlap role',
  example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  required: false,
})
@Column({ type: 'uuid', nullable: true })
area_id?: string;

@ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'area_id' })
area?: Area;
```

**Import required:** `import { Area } from '../../areas/entities/area.entity';`

### Role Group Constants

**New file:** `be/src/modules/users/constants/role-groups.ts`

```typescript
import { UserRole } from '../entities/user.entity';

export const CLOCKABLE_ROLES = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
];

export const AKTIVITAS_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
];

export const TASK_CREATORS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const TASK_RECEIVERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
];

export const OVERTIME_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
];

export const OVERTIME_APPROVERS = [
  UserRole.KORLAP,
];

export const MONITORING_CITY = [
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const MONITORING_RAYON = [
  UserRole.KEPALA_RAYON,
  ...MONITORING_CITY,
];

export const MONITORING_AREA = [
  UserRole.KORLAP,
  ...MONITORING_RAYON,
];

export const USER_MANAGERS = [
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const VALID_TASK_ASSIGNMENTS: Record<string, string[]> = {
  [UserRole.TOP_MANAGEMENT]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.ADMIN_SYSTEM]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.SUPERADMIN]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
};
```

### CreateUserDto Changes

**File:** `be/src/modules/users/dto/create-user.dto.ts`

**Current state:** role defaults to `UserRole.WORKER`, no `area_id` field.

**Target changes:**
```typescript
@IsEnum(UserRole)
@IsOptional()
role?: UserRole = UserRole.SATGAS; // Changed from WORKER

@IsUUID()
@IsOptional()
@ValidateIf(o => o.role === UserRole.KEPALA_RAYON)
rayon_id?: string; // Required if role is kepala_rayon

@IsUUID()
@IsOptional()
@ValidateIf(o => o.role === UserRole.KORLAP)
area_id?: string; // Required if role is korlap (NEW field)
```

### Guards Update - Complete @Roles Mapping

Every `@Roles()` decorator in the codebase must be updated. Here is the complete mapping:

| Controller File | Method | Current @Roles | Target @Roles |
|----------------|--------|----------------|---------------|
| `shifts.controller.ts` | clockIn | `UserRole.WORKER` | `...CLOCKABLE_ROLES` |
| `shifts.controller.ts` | clockOut | `UserRole.WORKER` | `...CLOCKABLE_ROLES` |
| `shifts.controller.ts` | getCurrentShift | `UserRole.WORKER` | `...CLOCKABLE_ROLES` |
| `shifts.controller.ts` | getMyShifts | `UserRole.WORKER` | `...CLOCKABLE_ROLES` |
| `shifts.controller.ts` | getActiveShifts | `ADMIN, SUPERVISOR` | `...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON` |
| `reports.controller.ts` | create | `UserRole.WORKER` | `...AKTIVITAS_SUBMITTERS` |
| `reports.controller.ts` | getMyReports | `UserRole.WORKER` | `...AKTIVITAS_SUBMITTERS` |
| `reports.controller.ts` | findAll | `ADMIN, SUPERVISOR` | `...MONITORING_AREA` |
| `reports.controller.ts` | update | `UserRole.WORKER` | `...AKTIVITAS_SUBMITTERS` |
| `tasks.controller.ts` | create | `ADMIN, KEPALA_RAYON, KOORDINATOR_LAPANGAN` | `...TASK_CREATORS` |
| `tasks.controller.ts` | myTasks | `WORKER, LINMAS` | `...TASK_RECEIVERS` |
| `tasks.controller.ts` | complete | `WORKER, LINMAS` | `...TASK_RECEIVERS` |
| `monitoring.controller.ts` | getCityStats | `ADMIN, TOP_MANAGEMENT` | `...MONITORING_CITY` |
| `monitoring.controller.ts` | getRayonStats | `+KEPALA_RAYON` | `...MONITORING_RAYON` |
| `monitoring.controller.ts` | getAreaStats | `+KOORDINATOR_LAPANGAN, SUPERVISOR` | `...MONITORING_AREA` |
| `monitoring.controller.ts` | getLiveWorkers | `+KOORDINATOR_LAPANGAN, SUPERVISOR` | `...MONITORING_AREA` |
| `users.controller.ts` | CRUD operations | `ADMIN` | `...USER_MANAGERS` |
| `areas.controller.ts` | CRUD operations | `ADMIN` | `...USER_MANAGERS` |
| `rayons.controller.ts` | CRUD operations | `ADMIN` | `...USER_MANAGERS` |

---

## B. Shifts Module

### GPS Boundary Removal

**File:** `be/src/modules/shifts/shifts.service.ts`

The `clockIn()` method currently has 5 steps. **Remove step 3 (GPS boundary validation):**

```typescript
// CURRENT clockIn() flow:
// 1. Check if user already has active shift
// 2. Verify worker assignment (area_id from DTO)
// 3. Validate GPS boundary ← REMOVE THIS STEP
// 4. Upload selfie to S3
// 5. Create shift record

// REMOVE these lines:
// const isWithinBoundary = GpsUtil.isWithinBoundary(
//   dto.gps_lat, dto.gps_lng,
//   area.gps_lat, area.gps_lng,
//   area.radius_meters + BOUNDARY_TOLERANCE
// );
// if (!isWithinBoundary) { throw new BadRequestException(...) }
```

**Keep:**
- GPS coordinates recording (gps_lat, gps_lng stored on shift record)
- Selfie photo upload to S3
- Area association (from auto-detect, not DTO)

### ClockInDto Transformation

**File:** `be/src/modules/shifts/dto/clock-in.dto.ts`

**Current DTO (all fields REQUIRED):**
```typescript
export class ClockInDto {
  @IsUUID()
  area_id: string;        // REQUIRED - Phase 2C: make OPTIONAL (auto-detect)

  @IsNumber() @Min(-90) @Max(90)
  gps_lat: number;        // Keep REQUIRED

  @IsNumber() @Min(-180) @Max(180)
  gps_lng: number;        // Keep REQUIRED

  @IsString() @MaxLength(10_000_000)
  @Matches(/^data:image\/(jpeg|jpg|png);base64,.../)
  selfie_photo: string;   // Keep REQUIRED
}
```

**Target DTO:**
```typescript
export class ClockInDto {
  @IsUUID()
  @IsOptional()  // NEW: optional, auto-detected from WorkerSchedule
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

### Clockable Roles Expansion

**Current:** Only `UserRole.WORKER` can clock in/out
**Phase 2C:** All `CLOCKABLE_ROLES` (satgas, linmas, korlap, admin_data, kepala_rayon)

**File:** `be/src/modules/shifts/shifts.controller.ts`

Update all clock-in/out endpoints:
```typescript
@Roles(...CLOCKABLE_ROLES)
```

### Area Auto-Detection

**File:** `be/src/modules/shifts/shifts.service.ts`

Add new method using correct WorkerSchedule field names:

```typescript
async getActiveArea(userId: string): Promise<Area | null> {
  const today = new Date();

  // 1. Check today's WorkerSchedule (PRIMARY source)
  // NOTE: Field is `effective_date` NOT `start_date`, and `user_id` NOT `worker_id`
  const schedule = await this.workerScheduleRepo.findOne({
    where: {
      user_id: userId,
      effective_date: LessThanOrEqual(today),
      end_date: Or(IsNull(), MoreThanOrEqual(today)),
    },
    relations: ['area'],
    order: { effective_date: 'DESC' },
  });
  if (schedule) return schedule.area;

  // 2. Fallback to WorkerAssignment (deprecated)
  const assignment = await this.workerAssignmentRepo.findOne({
    where: { worker_id: userId, deprecated: false },
    relations: ['area'],
  });
  if (assignment) return assignment.area;

  // 3. No area assigned - allow clock-in with null area (GPS still recorded)
  return null;
}
```

**Updated clockIn() logic:**
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

  // 3. GPS boundary validation REMOVED (Phase 2C)

  // 4. Upload selfie to S3
  const selfieUrl = await this.s3Service.uploadBase64(dto.selfie_photo, ...);

  // 5. Create shift record
  return this.shiftRepo.save({
    worker_id: userId,  // Column name is worker_id
    area_id: area?.id ?? null,
    clock_in_time: new Date(),
    clock_in_photo: selfieUrl,
    gps_lat: dto.gps_lat,
    gps_lng: dto.gps_lng,
  });
}
```

---

## C. Reports → Aktivitas Module

### Route Renaming

| Current Route | New Route | Method |
|--------------|-----------|--------|
| `POST /reports` | `POST /aktivitas` | Create aktivitas |
| `GET /reports` | `GET /aktivitas` | List aktivitas |
| `GET /reports/:id` | `GET /aktivitas/:id` | Get aktivitas detail |
| `GET /reports/my` | `GET /aktivitas/my` | My aktivitas |
| `DELETE /reports/:id` | _(removed)_ | No delete in 2C |

**Implementation approach:** Rename controller route prefix from `'reports'` to `'aktivitas'`. Optionally keep `/reports` as alias for 1 release cycle.

### CreateAktivitasDto

**File:** `be/src/modules/reports/dto/create-report.dto.ts` → rename to `create-aktivitas.dto.ts`

```typescript
export class CreateAktivitasDto {
  @IsUUID()
  @IsNotEmpty()
  activity_type_id: string;  // NOW REQUIRED (was optional)

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsArray()
  @ArrayMaxSize(3)
  @ArrayMinSize(1)    // At least 1 photo required
  @IsString({ each: true })
  photo_urls: string[]; // S3 URLs after upload (max 3)

  @IsNumber()
  @IsOptional()
  gps_lat?: number;

  @IsNumber()
  @IsOptional()
  gps_lng?: number;

  // shift_id is NOT from client — auto-populated from active shift in service layer
}
```

### Photo Upload Strategy

**Multi-photo upload flow for aktivitas (max 3 photos):**

1. **Mobile app** captures photos via camera (camera only, no gallery)
2. **Mobile app** uploads each photo to `POST /upload/photo` (existing S3 upload endpoint)
3. **Mobile app** receives S3 URLs for each uploaded photo
4. **Mobile app** sends `CreateAktivitasDto` with `photo_urls: [url1, url2, url3]`

**Existing upload infrastructure:** The S3 upload service in `be/src/modules/uploads/` already handles base64 image uploads. The current single-photo flow on reports uses inline base64 in the DTO. For multi-photo:

- **Option A (recommended):** Create a separate `POST /uploads/photos` endpoint that accepts FormData with multiple files, returns array of S3 URLs. Mobile sends URLs in DTO.
- **Option B:** Keep inline base64 — send array of base64 strings in DTO (large payload, ~30MB for 3 photos).

**Recommendation:** Option A — separate upload endpoint.

### Service Changes

**File:** `be/src/modules/reports/reports.service.ts`

```typescript
async createAktivitas(userId: string, dto: CreateAktivitasDto): Promise<Report> {
  // 1. Verify user has active shift
  const activeShift = await this.shiftsService.getActiveShift(userId);
  if (!activeShift) {
    throw new BadRequestException('Harus clock-in terlebih dahulu');
  }

  // 2. Verify activity_type matches user's role using applicable_roles array
  const user = await this.usersService.findOne(userId);
  const activityType = await this.activityTypesService.findOne(dto.activity_type_id);

  // IMPORTANT: applicable_roles is TEXT[] array, check with .includes()
  if (!activityType.applicable_roles.includes(user.role)) {
    throw new BadRequestException('Jenis aktivitas tidak sesuai dengan role Anda');
  }

  // 3. Validate photo count (max 3)
  if (dto.photo_urls.length > 3) {
    throw new BadRequestException('Maksimal 3 foto per aktivitas');
  }
  if (dto.photo_urls.length < 1) {
    throw new BadRequestException('Minimal 1 foto per aktivitas');
  }

  // 4. Create report with shift_id from active shift
  return this.reportRepo.save({
    activity_type_id: dto.activity_type_id,
    description: dto.description,
    photo_urls: dto.photo_urls,
    gps_lat: dto.gps_lat,
    gps_lng: dto.gps_lng,
    worker_id: userId,       // Column name is worker_id
    shift_id: activeShift.id, // Already exists, NOT NULL
    area_id: activeShift.area_id,
  });
}
```

### Report Entity Changes Required

**File:** `be/src/modules/reports/entities/report.entity.ts`

1. Add `photo_urls` property:
```typescript
@Column({ type: 'text', array: true, default: '{}' })
photo_urls: string[];
```

2. Remove review fields: `is_reviewed`, `reviewed_by`, `reviewed_at`, `reviewer` relation
3. Make `report_type` optional (or remove enum usage)
4. Make `activity_type_id` required (remove `nullable: true`)

### Access Control

| Action | Roles | Notes |
|--------|-------|-------|
| Create aktivitas | satgas, linmas, korlap, admin_data | Must have active shift |
| View own aktivitas | satgas, linmas, korlap, admin_data | Filter by worker_id = userId |
| View all aktivitas | korlap (own area), kepala_rayon (own rayon), top_management, admin_system, superadmin | Auto-scope by role |

---

## D. Tasks Module

### Hierarchical Assignment Validation

**File:** `be/src/modules/tasks/tasks.service.ts`

```typescript
import { VALID_TASK_ASSIGNMENTS } from '../../users/constants/role-groups';

async createTask(creatorId: string, dto: CreateTaskDto): Promise<Task> {
  const creator = await this.usersService.findOne(creatorId);
  const assignee = await this.usersService.findOne(dto.assigned_to);

  // Validate assignment hierarchy
  const allowedTargets = VALID_TASK_ASSIGNMENTS[creator.role] || [];
  if (!allowedTargets.includes(assignee.role)) {
    throw new ForbiddenException(
      `Role ${creator.role} tidak dapat menugaskan ke ${assignee.role}`
    );
  }

  // Validate scope: kepala_rayon can only assign within own rayon
  if (creator.role === UserRole.KEPALA_RAYON && creator.rayon_id) {
    // Check if assignee is in creator's rayon (via area → rayon mapping)
    if (dto.area_id) {
      const area = await this.areasService.findOne(dto.area_id);
      if (area.rayon_id !== creator.rayon_id) {
        throw new ForbiddenException('Anda hanya dapat menugaskan di rayon Anda');
      }
    }
  }

  // Validate scope: korlap can only assign within own area
  if (creator.role === UserRole.KORLAP && creator.area_id) {
    if (dto.area_id && dto.area_id !== creator.area_id) {
      throw new ForbiddenException('Anda hanya dapat menugaskan di area Anda');
    }
  }

  const task = await this.taskRepo.save({
    ...dto,
    created_by: creatorId,
    status: TaskStatus.PENDING,
    assigned_at: new Date(),
  });

  // Handle tagging
  if (dto.tagged_user_ids?.length) {
    await this.addTags(task.id, dto.tagged_user_ids);
  }

  return task;
}
```

### TaskStatus Simplification

**File:** `be/src/modules/tasks/entities/task.entity.ts`

**Current (6 statuses):**
```typescript
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',      // REMOVE
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DECLINED = 'declined',      // REMOVE
}
```

**Target (4 statuses):**
```typescript
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}
```

**Task entity columns to REMOVE:**
- `decline_reason` (text)
- `declined_at` (timestamptz)
- `accepted_at` (timestamptz)

**Task entity changes:**
- `area_id`: Change from NOT NULL to nullable (tasks can be rayon-scoped)
- `activity_type_id`: DROP column
- `completion_gps_lat/lng`: DROP columns

### CreateTaskDto (Updated)

**File:** `be/src/modules/tasks/dto/create-task.dto.ts`

**Current state:** Has `activity_type_id` (optional), `area_id` (required), `priority` (optional).

**Target:**
```typescript
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsUUID()
  @IsNotEmpty()
  assigned_to: string;

  @IsUUID()
  @IsOptional()
  area_id?: string;     // NOW OPTIONAL (was required)

  @IsUUID()
  @IsOptional()
  rayon_id?: string;    // NEW field

  @IsDateString()
  @IsOptional()
  due_date?: string;    // Maps to `deadline` column

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;  // KEEP — useful for ordering

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagged_user_ids?: string[]; // NEW: CC-like tagging, view only
}
```

### CompleteTaskDto Transformation

**File:** `be/src/modules/tasks/dto/complete-task.dto.ts`

**Current DTO:**
```typescript
export class CompleteTaskDto {
  @IsString() @IsOptional()
  completion_photo_url?: string;  // Currently OPTIONAL → make REQUIRED

  @IsString() @IsOptional()
  completion_notes?: string;      // Currently OPTIONAL → keep optional

  @IsNumber() @IsNotEmpty()
  gps_lat: number;                // Currently REQUIRED → REMOVE

  @IsNumber() @IsNotEmpty()
  gps_lng: number;                // Currently REQUIRED → REMOVE
}
```

**Target DTO:**
```typescript
export class CompleteTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;            // NEW: required completion description

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  completion_photo_url: string;   // NOW REQUIRED (was optional)

  // GPS fields REMOVED — no longer tracked on task completion
}
```

### Task Tagging

**New entity:** `be/src/modules/tasks/entities/task-tag.entity.ts`

```typescript
@Entity('task_tags')
@Unique(['task_id', 'user_id'])
export class TaskTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

**Add to Task entity:**
```typescript
@OneToMany(() => TaskTag, tag => tag.task)
tags: TaskTag[];
```

### Task Tagging Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/tasks/tagged` | Tasks where I'm tagged | All authenticated |
| `POST` | `/tasks/:id/tag` | Add tagged users to task | Task creator only |
| `DELETE` | `/tasks/:id/tag/:userId` | Remove tag from task | Task creator only |

### Task List Filters

```typescript
// GET /tasks?filter=assigned  → Tasks assigned to me
// GET /tasks?filter=tagged    → Tasks where I'm tagged (via task_tags)
// GET /tasks?filter=created   → Tasks I created
// GET /tasks?status=pending|assigned|in_progress|completed
```

---

## E. Overtime Module (NEW)

### Module Structure

```
be/src/modules/overtime/
├── overtime.module.ts
├── overtime.controller.ts
├── overtime.service.ts
├── entities/
│   ├── overtime.entity.ts
│   └── overtime-aktivitas.entity.ts
└── dto/
    ├── create-overtime.dto.ts
    └── approve-overtime.dto.ts
```

### Entity: Overtime

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

  @OneToMany(() => OvertimeAktivitas, oa => oa.overtime, { cascade: true })
  aktivitas: OvertimeAktivitas[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Entity: OvertimeAktivitas

```typescript
@Entity('overtime_aktivitas')
export class OvertimeAktivitas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  overtime_id: string;

  @Column({ type: 'uuid' })
  activity_type_id: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photo_urls: string[];

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  gps_lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  gps_lng: number;

  @ManyToOne(() => Overtime, o => o.aktivitas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'overtime_id' })
  overtime: Overtime;

  @ManyToOne(() => ActivityType)
  @JoinColumn({ name: 'activity_type_id' })
  activity_type: ActivityType;

  @CreateDateColumn()
  created_at: Date;
}
```

### Overtime Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST` | `/overtime` | Submit overtime request | satgas, linmas |
| `GET` | `/overtime/my` | My overtime requests | satgas, linmas |
| `GET` | `/overtime` | Pending approvals | korlap |
| `GET` | `/overtime/:id` | Overtime detail | Owner, korlap, admin_system, superadmin |
| `PATCH` | `/overtime/:id/approve` | Approve overtime | korlap |
| `PATCH` | `/overtime/:id/reject` | Reject overtime | korlap |

### CreateOvertimeDto

```typescript
export class CreateOvertimeDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start_time: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end_time: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOvertimeAktivitasDto)
  aktivitas: CreateOvertimeAktivitasDto[];
}

export class CreateOvertimeAktivitasDto {
  @IsUUID()
  @IsNotEmpty()
  activity_type_id: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  photo_urls: string[];

  @IsNumber()
  @IsOptional()
  gps_lat?: number;

  @IsNumber()
  @IsOptional()
  gps_lng?: number;
}
```

### Overtime Service Logic

```typescript
async submitOvertime(userId: string, dto: CreateOvertimeDto): Promise<Overtime> {
  const user = await this.usersService.findOne(userId);

  // Only satgas and linmas can submit
  if (!OVERTIME_SUBMITTERS.includes(user.role as UserRole)) {
    throw new ForbiddenException('Hanya satgas dan linmas yang dapat mengajukan lembur');
  }

  // Validate activity types match user's role using applicable_roles array
  for (const akt of dto.aktivitas) {
    const actType = await this.activityTypesService.findOne(akt.activity_type_id);
    // IMPORTANT: applicable_roles is TEXT[], check with .includes()
    if (!actType.applicable_roles.includes(user.role)) {
      throw new BadRequestException('Jenis aktivitas tidak sesuai role');
    }
  }

  // Get user's area from schedule (using correct field names)
  const area = await this.shiftsService.getActiveArea(userId);

  return this.overtimeRepo.save({
    user_id: userId,
    area_id: area?.id ?? null,
    ...dto,
  });
}

async approveOvertime(korlapId: string, overtimeId: string): Promise<Overtime> {
  const korlap = await this.usersService.findOne(korlapId);
  const overtime = await this.overtimeRepo.findOne({
    where: { id: overtimeId },
    relations: ['user', 'area'],
  });

  if (!overtime) throw new NotFoundException('Overtime tidak ditemukan');
  if (overtime.status !== 'pending') throw new BadRequestException('Overtime sudah diproses');

  // Korlap can only approve overtime in their area
  if (korlap.area_id && overtime.area_id && overtime.area_id !== korlap.area_id) {
    throw new ForbiddenException('Anda hanya dapat menyetujui lembur di area Anda');
  }

  return this.overtimeRepo.save({
    ...overtime,
    status: 'approved',
    approved_by: korlapId,
    approved_at: new Date(),
  });
}
```

---

## F. Monitoring Module

### Updated Role Access with Authorization

**File:** `be/src/modules/monitoring/monitoring.controller.ts`

```typescript
// City monitoring
@Roles(...MONITORING_CITY)
@Get('city')
async getCityStats() { ... }

// Rayon monitoring — with scope authorization
@Roles(...MONITORING_RAYON)
@Get('rayon/:rayonId')
async getRayonStats(@Param('rayonId') rayonId: string, @GetUser() user: User) {
  // Authorization: kepala_rayon can only access their own rayon
  if (user.role === UserRole.KEPALA_RAYON && user.rayon_id !== rayonId) {
    throw new ForbiddenException('Anda hanya dapat melihat monitoring rayon Anda');
  }
  return this.monitoringService.getRayonStats(rayonId);
}

// Area monitoring — with scope authorization
@Roles(...MONITORING_AREA)
@Get('area/:areaId')
async getAreaStats(@Param('areaId') areaId: string, @GetUser() user: User) {
  // Authorization: korlap can only access their own area
  if (user.role === UserRole.KORLAP && user.area_id !== areaId) {
    throw new ForbiddenException('Anda hanya dapat melihat monitoring area Anda');
  }
  return this.monitoringService.getAreaStats(areaId);
}
```

### Removed Roles from Monitoring

- `supervisor` — removed (legacy role, mapped to korlap)
- `admin` — split into `admin_system` (has monitoring) and `admin_data` (no monitoring)

---

## G. Activity Types Module

### Service Update for applicable_roles Array

**File:** `be/src/modules/activity-types/activity-types.service.ts`

The `findByRole()` method must query using PostgreSQL array contains (`ANY`), not equality:

```typescript
async findByRole(role: string): Promise<ActivityType[]> {
  return this.repo.createQueryBuilder('at')
    .where(':role = ANY(at.applicable_roles)', { role })
    .andWhere('at.is_active = true')
    .andWhere('at.deleted_at IS NULL')
    .getMany();
}
```

### API Endpoint (unchanged)

```typescript
// GET /activity-types?role=satgas → Filter by role (using applicable_roles array)
@Get()
async findAll(@Query('role') role?: string): Promise<ActivityType[]> {
  if (role) {
    return this.activityTypesService.findByRole(role);
  }
  return this.activityTypesService.findAll();
}
```

### Seed Data

See [database.md](./database.md) Migration 1 for complete seed SQL with correct `applicable_roles TEXT[]` format.

---

## H. Worker Assignments Reconciliation

### Strategy

1. **Primary source of truth:** WorkerSchedule (uses `user_id` + `effective_date` + `end_date`)
2. **Deprecated:** WorkerAssignment (keep for backward compatibility, mark deprecated)
3. **Clock-in logic:** Check schedule first, fallback to assignment

### Migration Path

1. For each WorkerAssignment, create corresponding WorkerSchedule if none exists
2. Mark WorkerAssignment as deprecated
3. Update Shifts module to check WorkerSchedule first (see `getActiveArea()` above)
4. Remove WorkerAssignment dependency from clockIn validation

---

## Error Codes (Phase 2C New)

| Code | HTTP | Message | Context |
|------|------|---------|---------|
| `OVERTIME_001` | 403 | Hanya satgas dan linmas yang dapat mengajukan lembur | Non-eligible role submits overtime |
| `OVERTIME_002` | 400 | Overtime sudah diproses | Approve/reject already processed overtime |
| `OVERTIME_003` | 403 | Anda hanya dapat menyetujui lembur di area Anda | Korlap approves outside their area |
| `OVERTIME_004` | 404 | Overtime tidak ditemukan | Invalid overtime ID |
| `TASK_HIER_001` | 403 | Role X tidak dapat menugaskan ke Y | Assignment hierarchy violation |
| `TASK_HIER_002` | 403 | Anda hanya dapat menugaskan di rayon Anda | Kepala rayon scope violation |
| `TASK_HIER_003` | 403 | Anda hanya dapat menugaskan di area Anda | Korlap scope violation |
| `AKTIVITAS_001` | 400 | Harus clock-in terlebih dahulu | Submit aktivitas without active shift |
| `AKTIVITAS_002` | 400 | Jenis aktivitas tidak sesuai dengan role Anda | Activity type not in applicable_roles |
| `AKTIVITAS_003` | 400 | Maksimal 3 foto per aktivitas | Photo count exceeded |
| `AKTIVITAS_004` | 400 | Minimal 1 foto per aktivitas | No photos provided |
| `MONITOR_001` | 403 | Anda hanya dapat melihat monitoring rayon Anda | Kepala rayon accessing other rayon |
| `MONITOR_002` | 403 | Anda hanya dapat melihat monitoring area Anda | Korlap accessing other area |

---

## New Endpoint Summary

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST` | `/overtime` | Submit overtime | satgas, linmas |
| `GET` | `/overtime/my` | My overtime requests | satgas, linmas |
| `GET` | `/overtime` | Pending approvals | korlap |
| `GET` | `/overtime/:id` | Overtime detail | Owner + managers |
| `PATCH` | `/overtime/:id/approve` | Approve overtime | korlap |
| `PATCH` | `/overtime/:id/reject` | Reject overtime | korlap |
| `GET` | `/tasks/tagged` | Tasks where I'm tagged | All authenticated |
| `POST` | `/tasks/:id/tag` | Add tags to task | Task creator |
| `DELETE` | `/tasks/:id/tag/:userId` | Remove tag | Task creator |
| `POST` | `/uploads/photos` | Multi-photo upload (returns URLs) | All authenticated |

## Modified Endpoint Summary

| Method | Path | Change | Description |
|--------|------|--------|-------------|
| `POST` | `/aktivitas` | Renamed from `/reports` | Create aktivitas |
| `GET` | `/aktivitas` | Renamed from `/reports` | List aktivitas |
| `GET` | `/aktivitas/:id` | Renamed from `/reports/:id` | Get detail |
| `GET` | `/aktivitas/my` | Renamed from `/reports/my` | My aktivitas |
| `POST` | `/shifts/clock-in` | Modified | GPS boundary removed, area optional, 5 roles |
| `POST` | `/tasks` | Modified | Hierarchical validation, tagging, area optional |
| `PATCH` | `/tasks/:id/complete` | Modified | Simplified (no GPS, photo+description required) |
| `GET` | `/monitoring/*` | Modified | Updated role access + scope authorization |

---

**Last Updated:** 2026-02-10
