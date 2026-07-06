# Phase 2E: Backend Requirements

**Last Updated:** 2026-03-15
**Status:** ✅ COMPLETE
**Framework:** NestJS 11.x, TypeScript 5.9, TypeORM
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)
**See also:** [Database Schema](./database.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| Entity/File | Key Facts |
|-------------|-----------|
| `AuthService` | `login()` accepts `{ username, password }`, finds user by `username` column only; compares with `user.password_hash` (NOT `user.password`) |
| `LoginDto` | Has `username: string` and `password: string` fields |
| `User entity` | Has `password_hash` (not `password`), `phone` column (varchar 20, nullable) — NOT used for login, no `phone_number` column |
| `CreateUserDto` | Missing phone_number field; both DTOs also lack existing `phone` validation |
| `UpdateUserDto` | Missing phone_number field |
| `ShiftsService.clockIn()` | `selfie_photo` optional base64 string (Phase 2E). Stored directly in `clock_in_photo_url`/`clock_out_photo_url` — no S3 upload (Mar 15 fix: was uploading to LocalStack, URL inaccessible on physical devices). When `isOvertime=true`, `shift_definition_id` is set to `null` (not matched against shift time windows) |
| `ClockInDto` | `selfie_photo: string` optional — `@IsOptional()`, `@IsString()`, `@MaxLength(10_000_000)` |
| `StatusCalculatorService` | Takes `StatusInput` with `isWithinArea: boolean`; `onLocationPing()` checks single `existing.area_id` for boundary |
| `MonitoringController` | `enforceScopeArea()` checks `user.area_id !== areaId`; `applyScopeFilters()` is synchronous, sets `filters.area_id = user.area_id` |
| `CLOCKABLE_ROLES` | `[SATGAS, LINMAS, KORLAP]` — admin_data and kepala_rayon are NOT clockable |
| `OVERTIME_SUBMITTERS` | `[SATGAS, LINMAS, KORLAP, ADMIN_DATA]` — admin_data already included (Phase 2C) |
| `OVERTIME_APPROVERS` | `[KORLAP, KEPALA_RAYON]` — no superadmin |
| `MONITORING_RAYON` | `[KEPALA_RAYON, ADMIN_DATA, ...MONITORING_CITY]` — admin_data already has monitoring access |
| `OvertimeService` | Creates overtime with `start_datetime`/`end_datetime` (timestamptz), `activity_type_id`, `description`, `photo_urls` — submission-based, no clock-in/out flow |
| `OvertimeStatus` enum | Only `PENDING`, `APPROVED`, `REJECTED` — no `IN_PROGRESS` status |
| `S3Service` | Exists at `apps/be/src/shared/services/s3.service.ts`; selfie upload uses base64 decode, not multipart |
| `TasksService` | Has `requestRevision()` with `revision_reason` field, no full audit trail |
| `EventsGateway` | Room-based WebSocket; admin_data already joins rayon rooms (Phase 2D); korlap joins single area room via `user.area_id` |

### Existing Role Constants Baseline

These constants already exist and are NOT being changed from Phase 2C/2D unless explicitly noted:
- `ACTIVITY_SUBMITTERS = [SATGAS, LINMAS, KORLAP, ADMIN_DATA]` — already includes admin_data
- `MONITORING_AREA = [KORLAP, ...MONITORING_RAYON]` — admin_data already has monitoring
- `MONITORING_RAYON = [KEPALA_RAYON, ADMIN_DATA, ...MONITORING_CITY]` — admin_data already at rayon level

**Phase 2E only changes:** `CLOCKABLE_ROLES` (add admin_data, kepala_rayon) and `OVERTIME_SUBMITTERS` (add kepala_rayon).

---

## Module Changes Overview

| Module | Change Type | Description |
|--------|-------------|-------------|
| `auth` | Enhancement | Identifier-based login (username OR phone_number) |
| `users` | Enhancement | phone_number, profile_picture_url, user_areas relation |
| `shifts` | Enhancement | is_overtime flag, optional selfie, multi-area boundary |
| `overtime` | Major redesign | Clock-in/clock-out flow, shift_id link |
| `monitoring` | Enhancement | Multi-area tracking, admin_data scope, rayon_id |
| `tasks` | Enhancement | Audit trail integration |
| `activities` | Enhancement | Audit trail integration |
| `gateways` | Enhancement | Multi-room for multi-area korlap, admin_data rooms |
| **New: `user-areas`** | New module | User-area assignment management |
| **New: `audit`** | New module | Generic audit logging service |

---

## A. Auth Module Changes

### A1. LoginDto Update

**File:** `apps/be/src/modules/auth/dto/login.dto.ts`

```typescript
export class LoginDto {
  @ApiProperty({ description: 'Username or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string; // replaces 'username'

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**Migration note:** The field name changes from `username` to `identifier`. This is a breaking API change — mobile and web clients must update simultaneously. **Transition strategy:** Consider temporarily accepting both `username` and `identifier` fields during deployment window by checking `dto.identifier ?? dto.username` to allow staggered rollout.

### A2. AuthService Login Logic

**File:** `apps/be/src/modules/auth/auth.service.ts`

```typescript
async login(dto: LoginDto): Promise<{ access_token: string; user: UserResponseDto }> {
  // Check if identifier looks like a phone number (starts with 0 or +)
  const isPhone = /^[+0]/.test(dto.identifier);

  let user: User | null;
  if (isPhone) {
    user = await this.usersRepository.findOne({
      where: { phone_number: dto.identifier },
    });
  } else {
    user = await this.usersRepository.findOne({
      where: { username: dto.identifier },
    });
  }

  // Fallback: if not found by phone, try username (and vice versa)
  if (!user) {
    user = await this.usersRepository.findOne({
      where: [
        { username: dto.identifier },
        { phone_number: dto.identifier },
      ],
    });
  }

  if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // ... generate JWT token
}
```

---

## B. Users Module Changes

### B1. User Entity Updates

**File:** `apps/be/src/modules/users/entities/user.entity.ts`

Add columns:
```typescript
@Column({ name: 'phone_number', length: 20, unique: true, nullable: true })
phone_number: string | null;

@Column({ name: 'profile_picture_url', type: 'text', nullable: true })
profile_picture_url: string | null;

@OneToMany(() => UserArea, (ua) => ua.user)
user_areas: UserArea[];
```

### B2. CreateUserDto / UpdateUserDto

**File:** `apps/be/src/modules/users/dto/create-user.dto.ts`

```typescript
@ApiPropertyOptional()
@IsOptional()
@IsString()
@Matches(/^(\+62|0)[0-9]{8,13}$/, { message: 'Invalid Indonesian phone number' })
phone_number?: string;
```

### B3. Profile Picture Upload Endpoint

**File:** `apps/be/src/modules/users/users.controller.ts`

```typescript
@Post(':id/profile-picture')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
async uploadProfilePicture(
  @Param('id', ParseUUIDPipe) id: string,
  @UploadedFile() file: Express.Multer.File,
  @GetUser() currentUser: User,
): Promise<{ profile_picture_url: string }> {
  // Validate: user can only update own profile, or admin can update any
  // Upload to S3 with path: profile-pictures/{userId}/{timestamp}.{ext}
  // Update user.profile_picture_url
  // Return new URL
}
```

**Validation:**
- Max file size: 5MB
- Allowed types: JPEG, PNG, WebP
- Auto-resize to max 500x500px (optional, can be done client-side)

### B4. Role Groups Update

**File:** `apps/be/src/modules/users/constants/role-groups.ts`

```typescript
// Phase 2E changes ONLY (other constants remain unchanged from Phase 2C/2D):
export const CLOCKABLE_ROLES = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_DATA, UserRole.KEPALA_RAYON];
// ↑ Added: ADMIN_DATA, KEPALA_RAYON (was: only SATGAS, LINMAS, KORLAP)

export const OVERTIME_SUBMITTERS = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_DATA, UserRole.KEPALA_RAYON];
// ↑ Added: KEPALA_RAYON (admin_data was already included in Phase 2C)

// NOTE: MONITORING_RAYON, MONITORING_AREA, MONITORING_CITY — NO CHANGES needed
// admin_data already has rayon-level monitoring access from Phase 2D
```

**Side effect warning:** Expanding `CLOCKABLE_ROLES` means admin_data and kepala_rayon can now access ALL endpoints guarded by `@Roles(...CLOCKABLE_ROLES)`, including `POST /shifts/clock-in`, `POST /shifts/clock-out`, and the Home screen. Verify all shift-related guards and screens handle rayon-level tracking for these roles.

**Approval hierarchy note:** Who approves kepala_rayon's overtime? Currently `OVERTIME_APPROVERS = [KORLAP, KEPALA_RAYON]`. Kepala rayon cannot approve their own overtime. Consider adding `superadmin` to `OVERTIME_APPROVERS` or creating a separate approval path for kepala_rayon overtime.

---

## C. New User Areas Module

### C1. UserArea Entity

**File:** `apps/be/src/modules/user-areas/entities/user-area.entity.ts`

See [database.md](./database.md) for full entity definition.

### C2. UserAreasService

**File:** `apps/be/src/modules/user-areas/user-areas.service.ts`

```typescript
@Injectable()
export class UserAreasService {
  // Get all areas assigned to a user (permanent + task_based)
  async getEffectiveAreas(userId: string): Promise<Area[]>;

  // Get permanent area assignments for a user
  async getPermanentAreas(userId: string): Promise<UserArea[]>;

  // Assign areas to user (admin action)
  async assignAreas(userId: string, areaIds: string[], assignedBy: string): Promise<UserArea[]>;

  // Remove area assignment
  async removeAssignment(userId: string, areaId: string): Promise<void>;

  // Sync task-based areas for a user (called when task status changes)
  async syncTaskBasedAreas(userId: string): Promise<void>;

  // Get all users assigned to an area
  async getUsersByArea(areaId: string): Promise<User[]>;
}
```

### C3. UserAreasController

**File:** `apps/be/src/modules/user-areas/user-areas.controller.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/:userId/areas` | JWT + korlap/kepala_rayon/admin+ | Get user's assigned areas |
| POST | `/users/:userId/areas` | JWT + kepala_rayon/admin+ | Assign areas to user |
| DELETE | `/users/:userId/areas/:areaId` | JWT + kepala_rayon/admin+ | Remove area assignment |
| GET | `/areas/:areaId/users` | JWT + korlap/admin+ | Get users in an area |

---

## D. Shifts Module Changes

### D1. Shift Entity Update

**File:** `apps/be/src/modules/shifts/entities/shift.entity.ts`

```typescript
@Column({ name: 'is_overtime', type: 'boolean', default: false })
is_overtime: boolean;
```

### D2. ShiftsService Changes

**File:** `apps/be/src/modules/shifts/shifts.service.ts`

#### Optional Selfie
```typescript
async clockIn(dto: ClockInDto, user: User): Promise<Shift> {
  // ... existing validation

  let clockInPhotoUrl: string | null = null;
  if (dto.selfie_photo) {
    clockInPhotoUrl = await this.s3Service.uploadFile(dto.selfie_photo, ...);
  }

  // ... create shift with clock_in_photo_url = clockInPhotoUrl (nullable)
}
```

#### Multi-Area Boundary Checking
```typescript
async getEffectiveBoundaries(user: User): Promise<AreaBoundary[]> {
  if (['admin_data', 'kepala_rayon'].includes(user.role)) {
    // Rayon-level boundary
    const rayon = await this.rayonRepository.findOne({ where: { id: user.rayon_id } });
    return rayon ? [{ type: 'rayon', id: rayon.id, polygon: rayon.boundary_polygon }] : [];
  }

  // Get permanent areas + task-based areas
  const effectiveAreas = await this.userAreasService.getEffectiveAreas(user.id);
  return effectiveAreas.map(area => ({
    type: 'area',
    id: area.id,
    polygon: area.boundary_polygon,
  }));
}
```

#### Overtime Clock-In
```typescript
async clockInOvertime(dto: OvertimeClockInDto, user: User): Promise<Shift> {
  // 1. Validate no active normal shift
  const activeShift = await this.findActiveShift(user.id);
  if (activeShift && !activeShift.is_overtime) {
    throw new BadRequestException('Must end normal shift before starting overtime');
  }

  // 2. Create shift with is_overtime = true
  const shift = this.shiftRepository.create({
    user_id: user.id,
    is_overtime: true,
    clock_in_at: new Date(),
    clock_in_gps_lat: dto.gps_lat,
    clock_in_gps_lng: dto.gps_lng,
    // ... other fields
  });

  // 3. Trigger status update
  await this.statusCalculatorService.onClockIn(user, shift);

  return shift;
}
```

### D3. ClockInDto Update

**File:** `apps/be/src/modules/shifts/dto/clock-in.dto.ts`

```typescript
@ApiPropertyOptional({ description: 'Base64 encoded selfie photo (optional)' })
@IsOptional()
@IsString()
@MaxLength(10_000_000, { message: 'Photo size must not exceed ~7.5MB (10MB base64 encoded)' })
@Matches(/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/, {
  message: 'Invalid base64 image format',
})
selfie_photo?: string; // Was required string, now optional. Base64 encoded, NOT multipart file.
```

---

## E. Overtime Module Redesign

### E0. Overtime Entity Current State (IMPORTANT)

The existing `Overtime` entity has these fields that the redesign must account for:
- `start_datetime` (timestamptz) — currently set upfront on submission
- `end_datetime` (timestamptz) — currently set upfront on submission (will be NULL at clock-in, set on clock-out)
- `activity_type_id` (FK) — embedded activity reference
- `description` (text) — activity description
- `photo_urls` (text[]) — activity photo evidence
- `gps_lat`, `gps_lng` — submission GPS

**Key change:** In the new flow, `end_datetime` will be NULL when overtime starts (set to `NOW()` at clock-in via the shift). It gets populated when `endOvertime()` is called. This requires making `end_datetime` nullable in the entity (currently has `default: () => 'NOW()'`).

**OvertimeStatus enum change:** Add `IN_PROGRESS = 'in_progress'` to the existing enum `{ PENDING, APPROVED, REJECTED }`. New flow: `IN_PROGRESS → PENDING_APPROVAL → APPROVED/REJECTED`.

**Existing fields retention:** The embedded activity fields (`activity_type_id`, `description`, `photo_urls`) are populated on `endOvertime()` instead of on submission. They become nullable at creation time.

### E1. OvertimeService Changes

**File:** `apps/be/src/modules/overtime/overtime.service.ts`

```typescript
@Injectable()
export class OvertimeService {
  // New: Start overtime (creates overtime record + triggers shift clock-in)
  async startOvertime(dto: StartOvertimeDto, user: User): Promise<Overtime> {
    // 1. Validate no active shift
    // 2. Create overtime record with status 'in_progress'
    // 3. Call shiftsService.clockInOvertime() to create overtime shift
    // 4. Link shift_id to overtime record
    // 5. Return overtime with shift
  }

  // New: End overtime (triggers shift clock-out, requires activity)
  async endOvertime(dto: EndOvertimeDto, user: User): Promise<Overtime> {
    // 1. Find active overtime for user
    // 2. Validate activity submitted (dto.activity_id or dto.activity required)
    // 3. Call shiftsService.clockOut() for the overtime shift
    // 4. Update overtime: end_time, status = 'pending_approval'
    // 5. Return overtime
  }

  // Existing: Approve/reject overtime (unchanged)
  async approveOvertime(id: string, approver: User): Promise<Overtime>;
  async rejectOvertime(id: string, reason: string, approver: User): Promise<Overtime>;
}
```

### E2. New DTOs

```typescript
// StartOvertimeDto
export class StartOvertimeDto {
  @IsNumber() gps_lat: number;
  @IsNumber() gps_lng: number;
  @IsOptional() @IsString() selfie_photo?: string; // base64 encoded
  @IsString() @IsNotEmpty() reason: string;
}

// EndOvertimeDto
export class EndOvertimeDto {
  @IsNumber() gps_lat: number;
  @IsNumber() gps_lng: number;
  @IsOptional() @IsString() selfie_photo?: string; // base64 encoded
  @IsUUID() @IsOptional() activity_id?: string; // Existing activity
  // OR inline activity submission
  @IsOptional() @ValidateNested() activity?: CreateActivityDto;
}
```

### E3. New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/overtime/start` | JWT + CLOCKABLE_ROLES | Start overtime (clock-in) |
| POST | `/overtime/end` | JWT + CLOCKABLE_ROLES | End overtime (clock-out + activity) |
| GET | `/overtime/active` | JWT + CLOCKABLE_ROLES | Get current active overtime |

---

## F. Monitoring Module Changes

### F1. StatusCalculatorService Multi-Area

**File:** `apps/be/src/modules/monitoring/services/status-calculator.service.ts`

```typescript
async calculateStatus(user: User, shift: Shift | null): Promise<TrackingStatus> {
  // ... existing threshold checks

  // Multi-area boundary check
  if (shift && lastGps) {
    const boundaries = await this.getEffectiveBoundaries(user);
    const isWithinAnyBoundary = boundaries.some(b =>
      this.gpsUtil.isPointInPolygon(lastGps, b.polygon)
    );

    if (!isWithinAnyBoundary) {
      return 'outside_area';
    }
  }

  // ... rest of status calculation
}

private async getEffectiveBoundaries(user: User): Promise<BoundaryInfo[]> {
  if (['admin_data', 'kepala_rayon'].includes(user.role)) {
    // Rayon-level boundary
    const rayon = await this.rayonRepository.findOne({ where: { id: user.rayon_id } });
    return rayon?.boundary_polygon ? [{ polygon: rayon.boundary_polygon, type: 'rayon' }] : [];
  }

  // User's effective areas (permanent + task-based)
  const effectiveAreas = await this.userAreasService.getEffectiveAreas(user.id);
  return effectiveAreas
    .filter(a => a.boundary_polygon)
    .map(a => ({ polygon: a.boundary_polygon, type: 'area' }));
}
```

### F2. MonitoringController Scope Changes

**File:** `apps/be/src/modules/monitoring/monitoring.controller.ts`

```typescript
// Update scope enforcement for admin_data
private applyScopeFilters(user: User, filters: LiveUsersFilterDto): LiveUsersFilterDto {
  switch (user.role) {
    case 'admin_data':
      // Same scope as kepala_rayon — rayon-level
      return { ...filters, rayon_id: user.rayon_id };
    case 'korlap':
      // Multi-area: get all assigned area IDs
      const areaIds = await this.userAreasService.getPermanentAreas(user.id);
      return { ...filters, area_ids: areaIds.map(a => a.area_id) };
    // ... existing cases
  }
}
```

**Note:** `area_id` filter becomes `area_ids` (array) for korlap with multiple areas.

### F3. UserTrackingStatus Entity Update

**File:** `apps/be/src/modules/monitoring/entities/user-tracking-status.entity.ts`

```typescript
@Column({ name: 'rayon_id', type: 'uuid', nullable: true })
rayon_id: string | null;

@ManyToOne(() => Rayon, { nullable: true })
@JoinColumn({ name: 'rayon_id' })
rayon: Rayon;
```

### F4. WebSocket Room Changes

**File:** `apps/be/src/gateways/events.gateway.ts`

```typescript
// On connection, join appropriate rooms
async handleConnection(client: Socket) {
  const user = await this.authenticateSocket(client);

  // admin_data joins rayon room (same as kepala_rayon)
  if (user.role === 'admin_data') {
    client.join(`monitoring:rayon:${user.rayon_id}`);
  }

  // korlap joins all assigned area rooms
  if (user.role === 'korlap') {
    const areas = await this.userAreasService.getPermanentAreas(user.id);
    for (const ua of areas) {
      client.join(`monitoring:area:${ua.area_id}`);
    }
  }

  // ... existing room joins
}
```

---

## G. New Audit Module

### G1. AuditLog Entity

See [database.md](./database.md) for entity definition.

### G2. AuditLogService

**File:** `apps/be/src/modules/audit/audit.service.ts`

```typescript
@Injectable()
export class AuditLogService {
  async log(params: {
    entity_type: 'task' | 'activity' | 'overtime' | 'shift';
    entity_id: string;
    action: string;
    actor_id: string;
    old_value?: Record<string, any>;
    new_value?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<AuditLog>;

  async getEntityHistory(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]>;
}
```

### G3. AuditLogController

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit/:entityType/:entityId` | JWT + entity-scoped | Get audit trail for entity |

**Access control rules:**
- Task audit trail: visible to task creator, assignee, and their supervisory chain (korlap for area, kepala_rayon for rayon)
- Activity audit trail: visible to activity submitter and approval chain
- Overtime audit trail: visible to submitter and approver chain
- admin_system/superadmin: can view all audit trails

### G4. Integration Points

```typescript
// TasksService — on status change
await this.auditLogService.log({
  entity_type: 'task',
  entity_id: task.id,
  action: 'status_changed',
  actor_id: user.id,
  old_value: { status: oldStatus },
  new_value: { status: newStatus },
});

// TasksService — on revision request
await this.auditLogService.log({
  entity_type: 'task',
  entity_id: task.id,
  action: 'revision_requested',
  actor_id: user.id,
  new_value: { revision_reason: reason },
});

// ActivitiesService — on approval/rejection
await this.auditLogService.log({
  entity_type: 'activity',
  entity_id: activity.id,
  action: approved ? 'approved' : 'rejected',
  actor_id: user.id,
  old_value: { status: 'pending' },
  new_value: { status: approved ? 'approved' : 'rejected' },
});
```

---

## H. Endpoint Summary (New/Modified)

| Method | Path | Change | Module |
|--------|------|--------|--------|
| POST | `/auth/login` | Modified (identifier field) | auth |
| POST | `/users/:id/profile-picture` | New | users |
| GET | `/users/:userId/areas` | New | user-areas |
| POST | `/users/:userId/areas` | New | user-areas |
| DELETE | `/users/:userId/areas/:areaId` | New | user-areas |
| GET | `/areas/:areaId/users` | New | user-areas |
| POST | `/overtime/start` | New | overtime |
| POST | `/overtime/end` | New | overtime |
| GET | `/overtime/active` | New | overtime |
| GET | `/audit/:entityType/:entityId` | New | audit |
| POST | `/shifts/clock-in` | Modified (optional selfie) | shifts |
| POST | `/shifts/clock-out` | Modified (optional selfie) | shifts |
| GET | `/monitoring/live-users` | Modified (multi-area filters) | monitoring |

**Total new endpoints:** 8
**Total modified endpoints:** 5

---

## I. Breaking Reference Audit: `user.area_id` for Korlap

The multi-area change affects every file that uses `user.area_id` for korlap-specific logic. **All** of these must be updated to use `userAreasService.getEffectiveAreas()` or `getPermanentAreas()`:

| File | Method/Location | Current Usage | Required Change |
|------|----------------|---------------|-----------------|
| `monitoring.controller.ts` | `enforceScopeArea()` | `user.area_id !== areaId` | Check if areaId is in user's assigned areas |
| `monitoring.controller.ts` | `applyScopeFilters()` | `filters.area_id = user.area_id` | `filters.area_ids = assignedAreaIds` (becomes async) |
| `monitoring.controller.ts` | `enforceScopeUser()` | Checks target user's area matches | Check target user's area is in korlap's assigned areas |
| `events.gateway.ts` | `handleConnection()` | `client.join(monitoring:area:${user.area_id})` | Join all assigned area rooms |
| `tasks.service.ts` | `checkTaskAccess()` | `task.area_id !== user.area_id` | Check task.area_id is in user's assigned areas |
| `tasks.service.ts` | `validateScope()` | Validates area_id matches user.area_id | Validate area_id is in user's assigned areas |
| `tasks.service.ts` | `findAll()` filter | `queryBuilder.andWhere('task.area_id = :areaId')` | Use `IN (:...areaIds)` clause |
| `overtime.service.ts` | Scoping | `requester.area_id` for area filtering | Use assigned areas for multi-area filtering |
| `activities.service.ts` | Approval scoping | Korlap area check | Check activity's area in korlap's assigned areas |
| `auth.service.ts` | Login response | Returns `area_id` in response | Keep as primary area; add `user_areas` to response |
| `shifts.service.ts` | `clockIn()` area detection | Uses Schedule area or user.area_id | Consider all assigned areas for boundary check |
| `supervisor.service.ts` | Various | Uses area_id for subordinate filtering | Use assigned areas |

**Note:** `user.area_id` column is NOT removed — it remains as the "primary" default area for backward compatibility. New code should use `user_areas` for all scope checks.

---

## J. Breaking API Changes Summary

| Endpoint | Before | After | Impact |
|----------|--------|-------|--------|
| `POST /auth/login` | `{ username, password }` | `{ identifier, password }` | All clients must update field name |
| `GET /monitoring/live-users` | `?area_id=<uuid>` | `?area_ids=<uuid>,<uuid>` | Filter param becomes array |
| `POST /shifts/clock-in` | `selfie_photo` required | `selfie_photo` optional | Non-breaking (relaxation) |
| `POST /overtime` | Submit with all fields | Deprecated — use `/overtime/start` + `/overtime/end` | Existing endpoint may remain for backward compat |
| WebSocket room join | Korlap joins 1 area room | Korlap joins N area rooms | Event routing changes |
