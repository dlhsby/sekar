# Phase 2E: Database Schema Changes

**Last Updated:** 2026-03-10
**Status:** Not Started
**Migration Strategy:** Single atomic migration with rollback support
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)
**See also:** [Backend Requirements](./backend.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| Fact | Actual Value | File |
|------|-------------|------|
| `users` table | UUID PK, username (unique), role, area_id (nullable), rayon_id (nullable), phone (nullable, NOT phone_number) | `apps/be/src/modules/users/entities/user.entity.ts` |
| `shifts` table | UUID PK, user_id, area_id (nullable), clock_in/out timestamps, GPS, outside_boundary flags, shift_definition_id | `apps/be/src/modules/shifts/entities/shift.entity.ts` |
| `overtimes` table | UUID PK, user_id, area_id, start_datetime (timestamptz), end_datetime (timestamptz), status (pending/approved/rejected), approved_by, approved_at, rejection_reason, activity_type_id (FK), description, photo_urls (text[]), gps_lat, gps_lng | `apps/be/src/modules/overtime/entities/overtime.entity.ts` |
| `user_tracking_status` table | user_id PK (FK), status, shift_id, area_id, is_within_area, last_gps_*, updated_at | `apps/be/src/modules/monitoring/entities/user-tracking-status.entity.ts` |
| `tasks` table | UUID PK, area_id, assigned_to, status, revision_reason | `apps/be/src/modules/tasks/entities/task.entity.ts` |
| `activities` table | UUID PK, user_id, status, approved_by | `apps/be/src/modules/activities/entities/activity.entity.ts` |
| `rayons` table | UUID PK, name, boundary_polygon JSONB, center_lat, center_lng, boundary_computed_at | `apps/be/src/modules/rayons/entities/rayon.entity.ts` |
| `areas` table | UUID PK, name, boundary_polygon JSONB, gps_lat, gps_lng, radius_meters, rayon_id | `apps/be/src/modules/areas/entities/area.entity.ts` |
| S3 service | Exists for file uploads (selfie photos) | `apps/be/src/shared/services/s3.service.ts` |
| Existing `phone` column | Users entity has `phone` (varchar, nullable) — NOT used for login | `apps/be/src/modules/users/entities/user.entity.ts` |

---

## Migration Overview

| Change | Type | Details |
|--------|------|---------|
| Alter table: `users` | ADD COLUMNS | `phone_number` (varchar 20, unique), `profile_picture_url` (text) |
| New table: `user_areas` | CREATE | Many-to-many user-area junction with assignment_type |
| Alter table: `shifts` | ADD COLUMN | `is_overtime` (boolean, default false) |
| Alter table: `overtimes` | ADD COLUMN | `shift_id` (UUID FK to shifts, nullable) |
| Alter table: `user_tracking_status` | ADD COLUMN | `rayon_id` (UUID FK to rayons, nullable) |
| New table: `audit_logs` | CREATE | Generic audit trail for entity changes |
| New indexes | CREATE INDEX | On user_areas, audit_logs, users.phone_number |

---

## Migration SQL

### 1. Alter `users` Table

```sql
-- Add phone_number for login (separate from existing phone field)
-- Use a unique partial index instead of UNIQUE constraint to avoid double index overhead
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
CREATE UNIQUE INDEX idx_users_phone_number ON users (phone_number) WHERE phone_number IS NOT NULL;

-- Add profile picture URL
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
```

**Note:** The existing `phone` column (varchar 20, nullable) remains for backward compatibility as a display phone number. `phone_number` is the new field used exclusively for authentication. The unique partial index on `phone_number` ensures uniqueness among non-NULL values while allowing multiple NULL entries.

**Deprecation plan:** The `phone` column should be deprecated in Phase 3. During Phase 2E, migrate valid Indonesian phone numbers from `phone` to `phone_number`, then plan to drop `phone` in a future phase.

### 2. New `user_areas` Table

```sql
CREATE TABLE user_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'permanent',
    -- 'permanent': korlap/satgas/linmas assigned areas
    -- 'task_based': auto-computed from active tasks (satgas/linmas)
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_area UNIQUE (user_id, area_id, assignment_type),
    CONSTRAINT chk_user_areas_assignment_type CHECK (assignment_type IN ('permanent', 'task_based'))
);

CREATE INDEX idx_user_areas_user_type ON user_areas (user_id, assignment_type);
CREATE INDEX idx_user_areas_area ON user_areas (area_id);
```

### 3. Alter `shifts` Table

```sql
-- Flag to distinguish overtime shifts from normal shifts
ALTER TABLE shifts ADD COLUMN is_overtime BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_shifts_is_overtime ON shifts (is_overtime) WHERE is_overtime = true;
```

### 4. Alter `overtimes` Table

```sql
-- Link overtime record to the overtime shift (clock-in/clock-out)
ALTER TABLE overtimes ADD COLUMN shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
-- Also add IN_PROGRESS to OvertimeStatus enum (currently only: pending, approved, rejected)
-- TypeORM handles this via entity enum update; for raw SQL:
-- ALTER TYPE overtime_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'pending';
CREATE INDEX CONCURRENTLY idx_overtimes_shift ON overtimes (shift_id) WHERE shift_id IS NOT NULL;
```

### 5. Alter `user_tracking_status` Table

```sql
-- Add rayon tracking for admin_data and kepala_rayon
ALTER TABLE user_tracking_status ADD COLUMN rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL;
CREATE INDEX CONCURRENTLY idx_tracking_rayon ON user_tracking_status (rayon_id) WHERE rayon_id IS NOT NULL;
```

### 6. New `audit_logs` Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    -- 'task', 'activity', 'overtime', 'shift'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    -- 'created', 'status_changed', 'revision_requested', 'approved', 'rejected', 'updated'
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- ON DELETE RESTRICT is intentional: audit logs are immutable records;
    -- hard-deleting a user with audit entries should be prevented.
    -- Users should be soft-deleted (deleted_at) instead.
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    -- Additional context: { reason: string, ip_address: string, etc. }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index covering the main query pattern: entity timeline ordered by time
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id);
-- BRIN index for time-range queries (space-efficient for append-only table)
CREATE INDEX idx_audit_created ON audit_logs USING BRIN (created_at);
CREATE INDEX idx_audit_action ON audit_logs (entity_type, action);
```

---

## Rollback SQL

```sql
-- Reverse all Phase 2E changes
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS user_areas;

ALTER TABLE user_tracking_status DROP COLUMN IF EXISTS rayon_id;
ALTER TABLE overtimes DROP COLUMN IF EXISTS shift_id;
ALTER TABLE shifts DROP COLUMN IF EXISTS is_overtime;
ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_url;
DROP INDEX IF EXISTS idx_users_phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
```

---

## Entity Changes Summary

### Users Entity Changes

```typescript
// New columns in User entity
@Column({ name: 'phone_number', length: 20, unique: true, nullable: true })
phone_number: string | null;

@Column({ name: 'profile_picture_url', type: 'text', nullable: true })
profile_picture_url: string | null;

// New relation
@OneToMany(() => UserArea, (ua) => ua.user)
user_areas: UserArea[];
```

### Shifts Entity Changes

```typescript
@Column({ name: 'is_overtime', type: 'boolean', default: false })
is_overtime: boolean;
```

### Overtimes Entity Changes

```typescript
@Column({ name: 'shift_id', type: 'uuid', nullable: true })
shift_id: string | null;

@ManyToOne(() => Shift, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'shift_id' })
shift: Shift;
```

### UserTrackingStatus Entity Changes

```typescript
@Column({ name: 'rayon_id', type: 'uuid', nullable: true })
rayon_id: string | null;

@ManyToOne(() => Rayon, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'rayon_id' })
rayon: Rayon;
```

### New UserArea Entity

```typescript
@Entity('user_areas')
export class UserArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (u) => u.user_areas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  area_id: string;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ length: 20, default: 'permanent' })
  assignment_type: 'permanent' | 'task_based';

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  assigned_at: Date;

  @Column({ type: 'uuid', nullable: true })
  assigned_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assigner: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
```

### New AuditLog Entity

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  entity_type: string; // 'task' | 'activity' | 'overtime' | 'shift'

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ length: 50 })
  action: string; // 'created' | 'status_changed' | 'revision_requested' | 'approved' | 'rejected' | 'updated'

  @Column({ type: 'uuid' })
  actor_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'jsonb', nullable: true })
  old_value: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_value: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
```

---

## Seeder Updates

### New Phone Numbers for Existing Users

```typescript
// seed-phase2e.ts (or update seed-phase2.ts)
const userPhoneNumbers = [
  { username: 'admin', phone_number: null },          // admin_system - no phone required
  { username: 'superadmin', phone_number: null },      // superadmin - no phone required
  { username: 'korlap1', phone_number: '081234567001' },
  { username: 'korlap2', phone_number: '081234567002' },
  { username: 'satgas1', phone_number: '081234567011' },
  { username: 'satgas2', phone_number: '081234567012' },
  { username: 'linmas1', phone_number: '081234567021' },
  { username: 'linmas2', phone_number: '081234567022' },
  { username: 'admin_data1', phone_number: '081234567031' },
  { username: 'kepala_rayon1', phone_number: '081234567041' },
  { username: 'top_management1', phone_number: '081234567051' },
];
```

### Multi-Area Assignments

```typescript
const userAreaAssignments = [
  // Korlap1 handles 2 areas in Rayon 1
  { username: 'korlap1', area_name: 'Taman Bungkul', assignment_type: 'permanent' },
  { username: 'korlap1', area_name: 'Taman Prestasi', assignment_type: 'permanent' },
  // Korlap2 handles 2 areas in Rayon 2
  { username: 'korlap2', area_name: 'Taman Mundu', assignment_type: 'permanent' },
  { username: 'korlap2', area_name: 'Taman Flora', assignment_type: 'permanent' },
  // Satgas default areas
  { username: 'satgas1', area_name: 'Taman Bungkul', assignment_type: 'permanent' },
  { username: 'satgas2', area_name: 'Taman Prestasi', assignment_type: 'permanent' },
];
```

---

## Data Migration Strategy

### Phone Number Population

1. If existing `phone` column has valid Indonesian phone numbers (08xxx), copy to `phone_number`
2. For users without phone numbers, leave `phone_number` as NULL
3. Enforce phone_number on next user edit for clockable roles (frontend validation)

### User Area Migration

1. For users with `area_id` set, create corresponding `user_areas` record with `permanent` type
2. For korlap users, keep existing `area_id` as primary and add via `user_areas`
3. `user.area_id` column remains for backward compatibility (primary/default area)

### Overtime Migration

1. Existing overtime records keep their current structure (no `shift_id`)
2. New overtime records will have `shift_id` pointing to the overtime shift
3. Legacy overtimes can be identified by `shift_id IS NULL`
