# Phase 4: Backend Specifications

**Date:** May 22, 2026 (revamp pass — sections below remain from March 12; updated facts in §0)
**Status:** ⏳ Not Started
**Depends On:** Phase 3 complete; Redis 7 + Socket.IO Redis adapter + FCM already live
**Related Sub-Phases:** 4-1 (trimmed infra), 4-3 (FCM hardening), 4-5 (Export), 4-6 (Seeder/data mgmt), 4-7 (Refactor/security), **NEW: ChangePassword flow + BullMQ-on-Redis**

---

## 0. Reality check — May 22, 2026 (overrides March-12 facts in §1)

| Fact | Updated value |
|------|---------------|
| FCM | **Live** — `FCM_ENABLED=true` in `be/.env` and `be/.env.example`; 8 trigger points wired; `sendToUser()` operational |
| Redis | **Live** — `ioredis@5.10.1` + `@socket.io/redis-adapter@8.3.0` in `be/package.json`; adapter wired in `be/src/gateways/events.gateway.ts:93` |
| Sentry | Still not integrated — 4-1 B3 |
| Logging | Still inconsistent console.log / Logger mix — 4-1 B1 |
| Cron jobs | 1 active (monitoring 60s); 4-3 + 4-6 add 5 more |
| Rate limiting | Global ThrottlerModule (100 req/min, 5 req/min login — `AUTH_LOGIN_THROTTLE_*` env knobs added in Phase 3); per-endpoint limits → 4-7 |
| JWT | 7-day expiry, no refresh, no blacklist — 4-7 D2 |
| Broker | **None today.** No BullMQ / AMQP / Kafka. **4-V Gap 4 decides** — likely BullMQ-on-existing-Redis (no new infra) per [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md) |

---

## ⊕ Revamp-driven backend changes (May 22, 2026)

### R1. `users.password_must_change` boolean column (drives mobile AS-5 + web AS-5 mirror)

**Migration:** `users` add `password_must_change BOOLEAN NOT NULL DEFAULT false`.

**Behavior:**

- Admin reset-password endpoint sets `password_must_change = true` and writes a temporary random password.
- `POST /auth/login` returns user object with `password_must_change` flag in payload.
- `POST /auth/change-password` clears the flag and updates the password (existing endpoint, extended to accept the post-reset call).
- Mobile auth-guard reads the flag from `/auth/me` and pushes to AS-5 `ChangePasswordScreen` before any other route.
- Per [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md), no self-serve reset endpoint is added — admins reset on behalf of users.

### R2. BullMQ retry queue on existing Redis (per [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md))

**Decision:** Adopt [BullMQ](https://docs.bullmq.io/) as a job queue layered over the existing Redis 7. **No new infrastructure.** Workloads:

| Queue | Producer | Worker | Retry policy |
|-------|----------|--------|--------------|
| `fcm-retry` | `notifications.service.sendToUser()` (on failure) | `FcmRetryProcessor` | Exponential backoff 1m / 5m / 30m / 2h / 12h; drop after 5 failures |
| `export-jobs` | `POST /export` (async, > 5k rows) | `ExportJobProcessor` | Manual retry only; failures notify requestor |
| `csv-import` | `POST /import/*/csv` (async, > 1k rows) | `CsvImportProcessor` | No retry; report errors row-by-row |
| `kmz-parse` | `POST /import/kmz` (heavy) | `KmzParseProcessor` | 1 retry on parse-timeout |

**Files (new):**

- `be/src/queues/bullmq.module.ts` — single module registers all queues + workers
- `be/src/queues/fcm-retry/fcm-retry.queue.ts`, `fcm-retry.processor.ts`
- `be/src/queues/export/export.processor.ts` (works with `4-5` `ExportModule`)
- Other processors land alongside their feature modules

**Dependency:** `bullmq@^5` (no `bull` legacy). Reuses existing `ioredis` connection — must use a separate connection per BullMQ guidance, but the same Redis instance.

### R3. Notification preferences (was in 4-3 — re-confirmed)

**Entity:** `notification_preferences` (user_id, type, enabled, updated_at). Default = all-enabled.

**Endpoints:**

- `GET /notifications/preferences` — current user
- `PATCH /notifications/preferences` — bulk update

### R4. NotificationsScreen / web inbox backing API

**Endpoints already exist** for the notifications collection (`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`). Verify response shape matches the new mobile NOTIF-1 + web inbox; extend with `?type=` filter and `?unread=true` if missing.

---

## 1. Current Codebase Facts (Verified March 12, 2026 — refreshed May 22 in §0)

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Value |
|------|-------|
| Modules | 18 (auth, users, rayons, areas, shifts, schedules, activities, tasks, overtime, notifications, monitoring, location, import, audit, user-areas, shift-definitions, activity-types, special-days) |
| Endpoints | ~130 |
| Tests | 1,264 passing (66 suites) |
| Coverage | 94.51% stmts, 83.49% branches |
| FCM | Infrastructure complete, `FCM_ENABLED=false`, `sendToUser()` not wired |
| Export | None |
| Logging | Inconsistent console.log / Logger mix |
| Redis | Not installed (no dependency in package.json) |
| Cron jobs | 1 active (monitoring status refresh every 60s) |
| Rate limiting | Global ThrottlerModule (100 req/min, 5 req/min login) |
| JWT | 7-day expiry, no refresh token, no blacklist |

---

## A. Health Module (Sub-Phase 4-1)

### A1. Health Endpoints

**File:** `be/src/modules/health/health.controller.ts`

```
GET /health            → { status: 'ok', timestamp: ISO8601 }
GET /health/full       → { status: 'ok', database: 'connected', redis: 'connected', uptime: seconds }
```

- `/health` — No auth required, lightweight (no DB query), used by mobile heartbeat and load balancer
- `/health/full` — Admin-only, checks DB connection pool and Redis ping

### A2. Health Module Structure

```
be/src/modules/health/
├── health.module.ts
├── health.controller.ts
├── health.controller.spec.ts
├── health.service.ts
└── health.service.spec.ts
```

---

## B. Structured Logging (Sub-Phase 4-1)

### B1. Logging Interceptor

**File:** `be/src/common/interceptors/logging.interceptor.ts`

Log every request in JSON format:

```json
{
  "timestamp": "2026-03-12T10:00:00.000Z",
  "requestId": "uuid-v4",
  "method": "POST",
  "url": "/shifts/clock-in",
  "userId": "uuid",
  "role": "satgas",
  "statusCode": 201,
  "responseTime": 142,
  "userAgent": "SekarMobile/1.0"
}
```

- Use `@nestjs/common Logger` with custom `ConsoleLogger` subclass
- JSON format in production (`NODE_ENV=production`), pretty-print in development
- Exclude health endpoint from request logging

**PII policy:** Request/response bodies MUST NOT be logged (PII risk: passwords, GPS coordinates, personal data). Log only: method, URL, status code, duration, user ID, request ID. Exception: log validation error details (field names only, not values).

### B2. Request ID Middleware

**File:** `be/src/common/middleware/request-id.middleware.ts`

- Generate UUID v4 if no `X-Request-ID` header present
- Attach to request object and response header
- Propagate through Logger context for correlation

### B3. Slow Query Interceptor

**File:** `be/src/common/interceptors/slow-query.interceptor.ts`

- Log warning for any request >500ms with full query context
- Log error for any request >2000ms
- Configurable thresholds via environment variables

---

## C. FCM Activation (Sub-Phase 4-3)

### C1. Trigger Points (8 Total)

Wire `NotificationsService.sendToUser()` at these locations:

| # | Trigger | Service File | Method | Recipient |
|---|---------|-------------|--------|-----------|
| 1 | Task assigned | `be/src/modules/tasks/tasks.service.ts` | `assign()` | Assignee |
| 2 | Task completed | `be/src/modules/tasks/tasks.service.ts` | `complete()` | Korlap of area |
| 3 | Task revision requested | `be/src/modules/tasks/tasks.service.ts` | `requestRevision()` | Assignee |
| 4 | Activity approved | `be/src/modules/activities/activities.service.ts` | `approve()` | Submitter |
| 5 | Activity rejected | `be/src/modules/activities/activities.service.ts` | `reject()` | Submitter |
| 6 | Overtime approved | `be/src/modules/overtime/overtime.service.ts` | `approve()` | Requester |
| 7 | Overtime rejected | `be/src/modules/overtime/overtime.service.ts` | `reject()` | Requester |
| 8 | Missing worker alert | `be/src/modules/monitoring/services/status-calculator.service.ts` | `calculateStatus()` (when status changes to MISSING) | All korlaps of worker's area + kepala_rayon |

> **Missing worker alert recipients (Phase 2E multi-area):** Use `user_areas` junction table to find ALL korlaps assigned to the worker's current area. Also notify `kepala_rayon` of the rayon containing the area.

> **"Current area" resolution for missing worker alert:**
> 1. Primary: use `user_tracking_status.area_id` (the area where the worker was last tracked)
> 2. Fallback: if `area_id` is NULL (no tracking status row exists), query `user_areas WHERE user_id = workerId AND is_primary = true` and use that area
> 3. If still NULL (worker has no area assignment at all), skip the alert entirely — do not send FCM

> **Circular dependency warning:** FCM trigger #8 risks circular dependency: `MonitoringModule -> NotificationsModule -> ... -> MonitoringModule`. Solution: use `@Inject(forwardRef(() => NotificationsService))` or extract an event-based pattern (e.g., EventEmitter2).

### C2. Notification Payload Format

```typescript
interface FcmPayload {
  title: string;        // e.g., "Tugas Baru Ditugaskan"
  body: string;         // e.g., "Anda ditugaskan untuk Pembersihan Taman Bungkul"
  data: {
    type: NotificationType;
    entityId: string;
    entityType: 'task' | 'activity' | 'overtime' | 'worker';
    deepLink: string;   // e.g., "sekar://tasks/uuid"
  };
}
```

### C3. Shift Reminder Cron

**File:** `be/src/modules/notifications/cron/shift-reminder.cron.ts`

- Recommended approach: cron runs every 15 minutes, finds schedules where shift starts within the next 15 minutes:
  ```sql
  SELECT s.*, sd.start_time FROM schedules s
  JOIN shift_definitions sd ON s.shift_definition_id = sd.id
  WHERE (s.effective_date + sd.start_time) BETWEEN NOW() AND NOW() + INTERVAL '15 min'
  ```
- Alternative (simpler cron): run daily at 21:00 (`@Cron('0 21 * * *', { timeZone: 'Asia/Jakarta' })`), scan for shifts starting in the next 60 minutes (catches Malam shift starting at 22:00 and other late-evening shifts)
- **Deduplication key:** `shift-reminder:{effective_date}:{userId}` where `effective_date` is the schedule's `effective_date` field, NOT `CURRENT_DATE`
  - Example: `SET shift-reminder:2026-03-12:uuid NX EX 86400` — only succeeds if key doesn't exist
  - Using `effective_date` (not the current date) is critical for Malam shifts (22:00–06:00): the reminder fires on `effective_date` at `shift_start - 15min` = 21:45. If the cron used `CURRENT_DATE`, a Malam shift starting at 00:30 (next calendar day) would generate the wrong key.
- Send FCM to each scheduled worker only if Redis `SET NX` succeeds
- Recommended index: `(effective_date, shift_definition_id)` on `schedules` table (add to index audit section I3)

### C4. Stale Status Cleanup Cron

**File:** `be/src/modules/monitoring/cron/stale-status.cron.ts`

- Run every hour
- Mark stale tracking entries as `offline` using the following SQL (users without an active open shift):

```sql
UPDATE user_tracking_status
SET status = 'offline', updated_at = NOW()
WHERE updated_at < NOW() - INTERVAL '24 hours'
  AND user_id NOT IN (
    SELECT user_id FROM shifts
    WHERE clock_in_time IS NOT NULL
      AND clock_out_time IS NULL
      AND deleted_at IS NULL
  );
```

- Do NOT delete records — deleting loses tracking history; setting `offline` is the correct semantic
- Log count of updated entries

---

## D. Notification Preferences (Sub-Phase 4-3)

### D1. Entity

**File:** `be/src/modules/notifications/entities/notification-preference.entity.ts`

```typescript
@Entity('notification_preferences')
@Unique(['user_id', 'notification_type'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  notification_type: string;  // 'task_assigned', 'activity_approved', etc.

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### D2. Endpoints

```
GET    /users/:id/notification-preferences     → NotificationPreference[]
PATCH  /users/:id/notification-preferences     → NotificationPreference[]
```

```typescript
// PATCH /users/:id/notification-preferences
interface UpdateNotificationPreferenceDto {
  preferences: {
    type: 'task_assigned' | 'task_completed' | 'task_revision' | 'activity_approved' | 'activity_rejected' | 'overtime_approved' | 'overtime_rejected' | 'missing_worker_alert' | 'shift_reminder';
    enabled: boolean;
  }[];
}
// Behavior: bulk upsert — updates existing rows, inserts missing ones
// Response: 200 OK with NotificationPreference[] (all preferences for user, reflecting state after upsert)
```

- Users can only modify their own preferences (unless admin_system/superadmin)
- Default: all notification types enabled
- `NotificationsService.sendToUser()` checks preference before sending

### D3. Lazy Row Creation & Default-On Semantics

Preference rows are created lazily — the `notification_preferences` table starts empty for every user:

- **Absence of a row = enabled.** The system defaults to sending all notification types unless a row explicitly sets `enabled: false`
- Rows are created only via `PATCH /users/:id/notification-preferences` (upsert)
- `GET /users/:id/notification-preferences` MUST return the full 9-type matrix regardless of which rows exist in the database. Missing rows are filled with `{ enabled: true }` before returning the response:

```typescript
const ALL_TYPES = [
  'task_assigned', 'task_completed', 'task_revision',
  'activity_approved', 'activity_rejected',
  'overtime_approved', 'overtime_rejected',
  'missing_worker_alert', 'shift_reminder',
];

// In GET handler:
const storedPrefs = await repo.find({ where: { user_id: userId } });
const storedMap = new Map(storedPrefs.map(p => [p.notification_type, p.enabled]));

return ALL_TYPES.map(type => ({
  notification_type: type,
  enabled: storedMap.has(type) ? storedMap.get(type) : true,
}));
```

- `NotificationsService.sendToUser()` preference check: query for the specific `(user_id, notification_type)` row; if no row found, treat as `enabled: true` (do not block the notification)

---

## E. Export Module (Sub-Phase 4-5)

### E1. Module Structure

```
be/src/modules/export/
├── export.module.ts
├── export.controller.ts
├── export.controller.spec.ts
├── export.service.ts
├── export.service.spec.ts
├── dto/
│   ├── export-request.dto.ts
│   └── export-job-response.dto.ts
├── entities/
│   └── export-job.entity.ts
└── exporters/
    ├── csv.exporter.ts
    ├── excel.exporter.ts
    └── kmz.exporter.ts
```

### E2. Export Endpoint

```
POST /export
Body: { entityType, format?, startDate?, endDate?, areaId?, rayonId? }
```

- **entityType:** users, areas, rayons, tasks, activities, overtime, schedules
- **format:** csv (default), xlsx, kmz (areas only)
- **Auth:** admin_system, superadmin, kepala_rayon (own rayon data only)
- **Rate limit:** 5 exports/minute/user (keyed by `@GetUser().id`, not per-IP)
- **Date range validator:** max 366-day range on `startDate`/`endDate` filter DTO fields
- **Rationale:** POST is semantically correct (creates a resource/job)

**Sync response** for ≤5000 rows:
- `200 OK`
- `Content-Type`: `text/csv` (CSV) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX) | `application/vnd.google-earth.kmz` (KMZ)
- `Content-Disposition`: `attachment; filename="{entityType}-{YYYY-MM-DD}.{ext}"`
- Implementation: use NestJS `StreamableFile` or `res.setHeader()` + `readable.pipe(res)`

**Async response** for >5000 rows: `202 Accepted` with `{ jobId, status: 'processing' }`, poll `GET /export/jobs/:jobId`

> **Route registration note:** `GET /export/jobs/:jobId` MUST be registered BEFORE any parameterized route like `GET /export/:entityType` to prevent Express matching `jobs` as an entityType. Using POST for the main export endpoint (as above) avoids this collision entirely.

### E3. Export Job Entity

**File:** `be/src/modules/export/entities/export-job.entity.ts`

```typescript
@Entity('export_jobs')
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 30 })
  entity_type: string;

  @Column({ type: 'varchar', length: 10 })
  format: string;

  @Column({ type: 'varchar', length: 20, default: 'processing' })
  status: string;  // 'processing' | 'completed' | 'failed'

  @Column({ type: 'text', nullable: true })
  file_url: string;

  @Column({ type: 'int', default: 0 })
  row_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- `file_url` stores S3 **object key** (e.g., `exports/users/2026-03-12-abc123.xlsx`), NOT a presigned URL
- `GET /export/jobs/:jobId` generates a fresh presigned URL with 15-minute TTL on each request
- Only the user who created the job can access it (guard: `job.user_id === currentUser.id`)
- `@ManyToOne(() => User, { onDelete: 'CASCADE' })` enables eager loading of user info for admin export job listing

### E4. Async Export Background Worker

**Pattern:** `setImmediate()` fire-and-forget (no Bull/BullMQ dependency yet)

**Flow:**
1. Controller creates `export_jobs` record with `status='processing'`
2. Calls `setImmediate(() => this.exportService.processJob(jobId))` — non-blocking
3. `processJob()` generates file, uploads to S3, updates `export_jobs.status='completed'` with `file_url` = S3 object key
4. On failure: updates `status='failed'` with error message in `error_message` column

**Retry cron:** `@Cron('*/5 * * * *', { timeZone: 'Asia/Jakarta' })` — every 5 minutes
- Find jobs stuck in `processing` status for >10 minutes (`updated_at < NOW() - INTERVAL '10 minutes'`)
- For each stuck job: increment `retry_count`, then immediately call `setImmediate(() => this.exportService.processJob(job.id))` — do NOT set status to `'pending'`; the job stays in `'processing'` and `processJob()` runs it again directly
- Max 3 retries: if `retry_count >= 3`, mark `status='failed'` with `error_message = 'Max retries exceeded'` and do NOT call `setImmediate()`
- **Status lifecycle:** jobs are created with `status='processing'` (matching entity default) — there is no `'pending'` state in the export flow. The cron directly re-fires stuck jobs rather than transitioning through an intermediate state.

> **Note:** The `status` default value `'processing'` in the entity `@Column` decorator AND in the DDL must match. Reconcile with `database.md` if it specifies a different default — the correct value is `'processing'`.

---

## F. CSV Import (Sub-Phase 4-5)

### F1. New Import Endpoints

**File:** `be/src/modules/import/import.controller.ts`

```
POST /import/users/csv     → { valid: UserRow[], errors: ValidationError[] }
POST /import/areas/csv     → { valid: AreaRow[], errors: ValidationError[] }
POST /import/:type/commit  → { imported: number, skipped: number }
```

- **Validate mode** (default): Parse CSV, validate each row against DTOs, return preview with `sessionId`
- **Commit mode** (`POST /import/confirm/:sessionId`): Insert validated rows from session
- Template download: `GET /import/templates/:type` returns empty CSV with headers

**Import session storage (Redis only — no database table):**
- Session stored exclusively in Redis key `import:{sessionId}` where `sessionId` is a UUID v4
- Value: JSON `{ userId, entityType, s3Key, validationResult, createdAt }`
- TTL: 3600 seconds (1 hour)
- No `import_sessions` database table is needed; Redis handles expiry automatically
- `POST /import/confirm/:sessionId` flow:
  1. `GET import:{sessionId}` from Redis — if missing/expired, return `404 Session not found`
  2. Validate `session.userId === currentUser.id` — if mismatch, return `403 Forbidden`
  3. Execute bulk insert from `session.validationResult.valid` rows
  4. `DEL import:{sessionId}` from Redis after successful commit

### F2. CSV Template Specifications

**Template download endpoint:** `GET /import/template/:entity` — returns an empty CSV file with only the header row and `Content-Disposition: attachment; filename="{entity}-template.csv"`.

**Users template** (`GET /import/template/users`):

| Column | Required | Validation Rules |
|--------|----------|-----------------|
| `username` | Yes | 3–50 chars, alphanumeric + underscore, unique |
| `full_name` | Yes | 2–100 chars |
| `phone_number` | Conditional | Required for satgas/linmas/korlap/admin_data/kepala_rayon; E.164 format (`+62...`) |
| `role` | Yes | Must be one of: `satgas`, `linmas`, `korlap`, `admin_data`, `kepala_rayon`, `top_management`, `admin_system` |
| `password` | Yes | Min 8 chars |
| `area_id` | No | Valid UUID, must exist in `areas` table |
| `rayon_id` | No | Valid UUID, must exist in `rayons` table |
| `employee_id` | No | Up to 20 chars, unique if provided |

**Areas template** (`GET /import/template/areas`):

| Column | Required | Validation Rules |
|--------|----------|-----------------|
| `name` | Yes | 2–100 chars, unique within rayon |
| `rayon_id` | Yes | Valid UUID, must exist in `rayons` table |
| `address` | No | Up to 500 chars |
| `latitude` | No | Decimal, -90 to 90 |
| `longitude` | No | Decimal, -180 to 180 |
| `radius_meters` | No | Integer, 10–10000 |

**Tasks template** (`GET /import/template/tasks`):

| Column | Required | Validation Rules |
|--------|----------|-----------------|
| `title` | Yes | 3–200 chars |
| `description` | No | Up to 2000 chars |
| `area_id` | Yes | Valid UUID, must exist in `areas` table |
| `assignee_id` | No | Valid UUID, must exist in `users` table |
| `due_date` | No | ISO 8601 date string (YYYY-MM-DD) |
| `priority` | No | `low`, `medium`, `high` (default: `medium`) |

**Validation error response format:**

```json
{
  "valid": [...],
  "errors": [
    { "row": 3, "column": "phone_number", "value": "0812xxx", "message": "Must be E.164 format (+62...)" },
    { "row": 7, "column": "role", "value": "admin", "message": "Invalid role. Use: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system" }
  ],
  "sessionId": "uuid-v4-only-present-when-valid.length > 0"
}
```

---

## G. Security Hardening (Sub-Phase 4-7)

### G1. Per-Endpoint Rate Limiting

**File:** `be/src/common/guards/rate-limit.guard.ts`

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| File upload (profile picture, import) | 10 | 1 min |
| Export | 5 | 1 min |
| Bulk operations (CSV import commit) | 3 | 1 min |
| Login attempts | 5 | 1 min |
| General API | 100 | 1 min |

Use `@nestjs/throttler` with Redis store for distributed rate limiting.

**Per-IP vs per-user tracking:**
- **General API (100 req/min)** and **Login (5 req/min)**: rate-limited per-IP address — uses the default `ThrottlerGuard` tracker key derived from the request IP
- **Export (5 req/min)** and **Bulk operations / CSV import commit (3 req/min)**: rate-limited per-user — keyed by `@GetUser().id` to prevent a single user from bypassing limits via different IP addresses (e.g., VPN rotation)
- **File upload (10 req/min)**: rate-limited per-IP (unauthenticated uploads not permitted; per-IP is sufficient for authenticated requests at this limit)

To implement per-user keying for export and bulk endpoints, use a custom `ThrottlerGuard` subclass that overrides `getTracker()`:

```typescript
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    return (req as any).user?.id ?? req.ip;
  }
}
```

### G2. JWT Refresh Token Rotation

**File:** `be/src/modules/auth/auth.service.ts`

```
POST /auth/login    → { access_token (15min), refresh_token (7d) }
POST /auth/refresh  → { access_token (15min), refresh_token (7d) }
POST /auth/logout   → Blacklist BOTH access + refresh tokens in Redis
  Body: { refreshToken: string }
```

- Access token: 15-minute expiry (down from 7 days)
- Refresh token: 7-day expiry, single-use (rotated on each refresh)
- Redis blacklist: `SET auth:blacklist:{tokenHash} 1 EX {remainingTTL}`
- Mobile: auto-refresh on 401 response, retry original request

**`refreshToken()` flow (C5):**
1. Compute `sha256(incomingRefreshToken)`
2. Check Redis blacklist `auth:blacklist:{hash}` — if found, reject with `401 Unauthorized` (token reuse attack detected)
3. Write `auth:blacklist:{hash}` to Redis with TTL = remaining validity of incoming refresh token
4. THEN generate and return new access + refresh token pair
5. On logout: blacklist BOTH current access token hash (from Authorization header) AND refresh token hash (from request body)

**`logout()` validation flow (C6):**
1. Extract `refreshToken` from request body `{ refreshToken: string }` — return `400 Bad Request` if missing
2. Verify JWT signature of the refresh token using the same secret used to sign it — if invalid signature, return `400 Bad Request` (do not attempt blacklisting)
3. Decode the verified token to extract the `exp` claim; compute remaining TTL as `exp - Math.floor(Date.now() / 1000)` seconds
4. Compute `sha256(refreshToken)` and `SET auth:blacklist:{hash} 1 EX {remainingTTL}` in Redis
5. Extract the access token from the `Authorization: Bearer <token>` header; compute `sha256(accessToken)` and extract its `exp` claim; `SET auth:blacklist:{sha256(accessToken)} 1 EX {remainingAccessTTL}` in Redis
6. Return `200 OK` with `{ message: 'Logged out successfully' }`

**Logout breaking change:** `POST /auth/logout` body must include `{ refreshToken: string }`. Server blacklists both access token (from Authorization header) and refresh token (from body). Mobile/Web clients must be updated to send refresh token on logout. Add to API versioning migration plan below.

**JWT access token config fix (C6):**
- `auth.module.ts` currently registers `JWT_EXPIRATION=7d` as module default
- `auth.service.ts` overrides with `JWT_ACCESS_EXPIRATION` env var (15m)
- Production MUST set `JWT_ACCESS_EXPIRATION=15m` and `JWT_REFRESH_EXPIRATION=7d` in env
- Migration plan: update `auth.module.ts` to use `JWT_EXPIRATION=15m` as default, breaking the 7d fallback
- Add `JWT_ACCESS_EXPIRATION` and `JWT_REFRESH_EXPIRATION` to deployment env var checklist

**API versioning migration plan (JWT expiry change):**
- JWT expiry change from 7d to 15m is a breaking change for mobile clients with cached tokens
- Phase 4: keep 7d expiry as fallback, add refresh token infrastructure
- Phase 4 + 1 week: mobile app update deployed with refresh token support
- Phase 4 + 2 weeks: switch access token to 15m, enable rotation
- Document in deployment.md

### G2b. Client-Side Token Refresh Interceptor

Mobile and web clients must implement an Axios response interceptor to handle access token expiry transparently:

**Interceptor behaviour:**
1. On any `401 Unauthorized` response, check whether the request was already a retry (avoid infinite loop)
2. Call `POST /auth/refresh` with the stored refresh token
3. On success: update stored access token, then retry the original failed request once
4. On refresh failure (e.g., `401` on `/auth/refresh`): force logout — clear all stored tokens and redirect to login screen

**Mutex for concurrent refreshes:**
- Multiple in-flight requests may all receive `401` simultaneously if the access token expires mid-flight
- Only ONE refresh call must be made, not one per failed request
- Implement with a mutex flag or a shared `Promise` reference:

```typescript
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = authApi.refresh(getRefreshToken())
      .then(res => { setAccessToken(res.access_token); return res.access_token; })
      .catch(err => { forceLogout(); throw err; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
```

- All concurrent `401` handlers await the same `refreshPromise`, then retry their original request with the new token
- If refresh fails, `forceLogout()` clears tokens and navigates to login; all pending retries are rejected

**Note:** This interceptor is documented here (backend spec) because it is a direct counterpart to the `POST /auth/refresh` endpoint. Implementation lives in `fe/mobile/src/services/api/` and `fe/web/src/lib/api/`.

### G3. Helmet.js Configuration

**File:** `be/src/main.ts`

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.s3.ap-southeast-1.amazonaws.com", process.env.AWS_ENDPOINT_URL],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

> **Swagger compatibility:** CSP headers from Helmet.js will break Swagger UI (`/api/docs`). Exclude `/api/docs` and `/api/docs-json` paths from Helmet middleware using NestJS middleware consumer: `consumer.apply(helmet()).exclude('api/docs(.*)')`

### G4. CORS Tightening

**File:** `be/src/main.ts`

```typescript
// Production
const corsOrigins = [
  'https://sekar.wahyutrip.com',
  'https://api.sekar.wahyutrip.com',
];

// Development
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.push('http://localhost:3001');
}
```

### G5. Input Sanitization Audit

Verify every DTO has:
- `@IsString()` / `@IsNumber()` / `@IsUUID()` on all fields
- `@MaxLength()` on all string fields
- `@IsEnum()` on all enum fields
- No raw SQL interpolation anywhere (all TypeORM parameterized)

---

## G6. New Error Codes (Phase 4)

The following error codes are introduced in Phase 4. Add them to `specs/api/error-handling.md` during sub-phase 4-10 (final cleanup pass).

**Export errors:**

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `EXPORT_001` | 404 | Export job not found | `GET /export/jobs/:jobId` — job ID does not exist or belongs to another user |
| `EXPORT_002` | 400 | Invalid export format | `POST /export` with unsupported `format` value (not `csv`, `xlsx`, or `kmz`) |
| `EXPORT_003` | 422 | Export size limit exceeded | Row count exceeds async threshold and async processing is temporarily unavailable |
| `EXPORT_004` | 500 | Export job failed | `GET /export/jobs/:jobId` — job has `status='failed'`; error details in `error_message` field |

**Notification errors:**

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `NOTIF_001` | 502 | Notification delivery failed | FCM `sendToUser()` throws (device token invalid, FCM quota exceeded, etc.) — logged but does NOT fail the originating request |

**Import errors:**

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `IMPORT_001` | 400 | CSV template invalid | Uploaded file has wrong headers, wrong MIME type, or is not valid UTF-8 |
| `IMPORT_002` | 422 | CSV validation failed | One or more rows failed validation — response includes `errors[]` array; no rows imported |

**Auth errors (additions to existing AUTH_* series):**

| Code | HTTP Status | Message | Trigger |
|------|-------------|---------|---------|
| `AUTH_010` | 401 | Refresh token expired | `POST /auth/refresh` — refresh token has passed its 7-day TTL |
| `AUTH_011` | 401 | Refresh token invalid | `POST /auth/refresh` — token signature invalid, token found in Redis blacklist, or token is reused after rotation |

> **Note:** `NOTIF_001` is non-blocking by design — FCM delivery failures are logged to Sentry but do not return an error to the API caller. The triggering action (task assignment, approval, etc.) still succeeds.

---

## H. Refactoring Targets (Sub-Phase 4-7)

### H1. ShiftsService + StatusCalculatorService → BoundaryCheckService

**Extract from BOTH:**
1. `be/src/modules/shifts/shifts.service.ts` (>400 lines) — clock-in GPS validation
2. `be/src/modules/monitoring/services/status-calculator.service.ts` — monitoring boundary checks (this is where most polygon logic lives)

**Extract to:** `be/src/shared/services/boundary-check.service.ts`

Methods to extract (with source mapping):

```typescript
// Source: be/src/modules/monitoring/services/status-calculator.service.ts
isWithinAreaBoundary(lat: number, lng: number, area: Area): boolean
// Polygon ray-casting algorithm + radius fallback

// Source: be/src/modules/monitoring/services/status-calculator.service.ts
findContainingArea(lat: number, lng: number, areas: Area[]): Area | null
// Returns the first area whose boundary contains the given coordinates

// Source: be/src/modules/shifts/shifts.service.ts (clock-in validation)
validateClockInLocation(lat: number, lng: number, userAreas: Area[]): { valid: boolean; area: Area | null; distance?: number }
// Returns validity flag, the matched area, and optional distance from nearest boundary
```

Additional method (existing, keep in BoundaryCheckService):
- `getActiveArea(user)` — resolves user's effective area(s) for boundary checking
- `findNearestArea(lat, lng, areas)` — used for rayon-level clock-in

### H2. UsersService → UserValidationService

**Current:** `be/src/modules/users/users.service.ts` → `create()` method
**Extract to:** `be/src/modules/users/services/user-validation.service.ts`

Concerns to separate:
1. Phone number uniqueness validation
2. Role-specific field requirements (phone required for satgas→top_management)
3. Area/rayon assignment validation

### H3. EventsGateway → RoomJoinService

**Current:** `be/src/gateways/events.gateway.ts` → `handleConnection()` (80+ lines)
**Extract to:** `be/src/gateways/services/room-join.service.ts`

Methods to extract:
- `getRoomsForUser(user)` — compute room list based on role and assignments
- `joinRooms(socket, rooms)` — join rooms with logging
- `leaveAllRooms(socket)` — cleanup on disconnect

**Module registration:** `RoomJoinService` is registered as a provider in `EventsModule` (not in a feature module). It depends on `UsersService`, so add `UsersModule` to `EventsModule.imports`.

### H4. emitToUser() Refactor (Required Before Redis Adapter)

**Current problem:** `emitToUser()` in `events.gateway.ts` iterates in-memory `connectedClients` Map. With Redis adapter, each instance only sees its own connections — personal events silently fail for users on other instances.

**Fix:** Refactor to `server.to('user:{userId}').emit(event, data)` pattern.

**Requirements:**
- On client connect in `handleConnection()`: auto-join room `user:{userId}`
- Replace all `emitToUser(userId, event, data)` calls with `server.to(\`user:${userId}\`).emit(event, data)`
- This MUST be done BEFORE activating Redis adapter in sub-phase 4-1

### H5. N+1 Query Fixes

The following services load related entities with individual queries per row (N+1 pattern). Fix each with `leftJoinAndSelect` in the `findAll()` query builder:

**TasksService.findAll()** (`be/src/modules/tasks/tasks.service.ts`):
```typescript
// Current (N+1): loads tasks, then loops to load assignee and area per task
// Fix:
return this.taskRepo.createQueryBuilder('task')
  .leftJoinAndSelect('task.assignee', 'assignee')
  .leftJoinAndSelect('task.area', 'area')
  .where(filters)
  .getMany();
```

**ActivitiesService.findAll()** (`be/src/modules/activities/activities.service.ts`):
```typescript
// Current (N+1): loads activities, then loads submitter and activity_type per row
// Fix:
return this.activityRepo.createQueryBuilder('activity')
  .leftJoinAndSelect('activity.submitter', 'submitter')
  .leftJoinAndSelect('activity.activityType', 'activityType')
  .where(filters)
  .getMany();
```

**OvertimeService.findAll()** (`be/src/modules/overtime/overtime.service.ts`):
```typescript
// Current (N+1): loads overtime records, then loads requester per row
// Fix:
return this.overtimeRepo.createQueryBuilder('overtime')
  .leftJoinAndSelect('overtime.requester', 'requester')
  .leftJoinAndSelect('overtime.approver', 'approver')
  .where(filters)
  .getMany();
```

**General rule:** Any `findAll()` that calls `find()` and then maps over results to load relations is a N+1. Use `leftJoinAndSelect` in the initial query or `relations` option in `find()` options:
```typescript
// Alternative using TypeORM find options (simpler for flat relations):
return this.taskRepo.find({ where: filters, relations: ['assignee', 'area'] });
```

---

## I. Data Management (Sub-Phase 4-6)

### I1. Location Log Retention

**File:** `be/src/modules/location/cron/retention.cron.ts`

```typescript
@Cron('0 2 * * *', { timeZone: 'Asia/Jakarta' })  // Daily at 2 AM WIB
async purgeOldLocationLogs() {
  // 1. Compute daily summary aggregates for logs about to be purged
  // 2. Insert summaries into location_daily_summaries table
  // 3. DELETE FROM location_logs WHERE logged_at < NOW() - INTERVAL '90 days'
  // 4. Log: "Purged X location logs older than 90 days, created Y daily summaries"
}
```

### I2. Soft-Delete Cleanup

**File:** `be/src/modules/users/cron/cleanup.cron.ts`

```typescript
@Cron('0 3 * * 0')  // Weekly on Sunday at 3 AM
async purgeDeletedUsers() {
  // DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '180 days'
  // Cascade: user_areas, shifts, activities, location_logs
  // Log: "Permanently deleted X users older than 180 days"
}
```

### I3. Database Index Audit

Verify these indexes exist (add migration if missing):

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| `location_logs` | `idx_location_logs_user_logged` | (user_id, logged_at DESC) | Composite |
| `shifts` | `idx_shifts_user_clockin` | (user_id, clock_in_time DESC) | Composite |
| `activities` | `idx_activities_user_status` | (user_id, status) | Composite |
| `tasks` | `idx_tasks_area_status` | (area_id, status) | Composite |
| `overtimes` | `idx_overtimes_user_status` | (user_id, status) | Composite |
| `audit_logs` | `idx_audit_entity` | (entity_type, entity_id) | Composite |
| `user_tracking_status` | `idx_tracking_area` | (area_id) | Single |
| `user_tracking_status` | `idx_tracking_rayon` | (rayon_id) | Single |
| `notification_preferences` | `idx_notif_pref_user` | (user_id) | Single |
| `export_jobs` | `idx_export_user_status` | (user_id, status) | Composite |
| `schedules` | `idx_schedules_date_shift` | (effective_date, shift_definition_id) | Composite |

### I4. Pagination Standardization

All `findAll()` methods must accept:

```typescript
interface PaginationDto {
  page?: number;    // default: 1
  limit?: number;   // default: 20, max: 100
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## J. Production Seeder (Sub-Phase 4-6)

### J1. seed-production.ts

**File:** `be/src/database/seeds/seed-production.ts`

```typescript
// Real DLH Surabaya data
const RAYONS = [
  { name: 'Rayon Utara', code: 'RU' },
  { name: 'Rayon Selatan', code: 'RS' },
  { name: 'Rayon Timur', code: 'RT' },
  { name: 'Rayon Barat', code: 'RB' },
  { name: 'Rayon Tengah', code: 'RTE' },
  { name: 'Rayon Tenggara', code: 'RTG' },
  { name: 'Rayon Barat Daya', code: 'RBD' },
];

// Shift definitions matching municipal schedule
const SHIFT_DEFINITIONS = [
  { name: 'Pagi', start_time: '06:00', end_time: '14:00' },
  { name: 'Siang', start_time: '14:00', end_time: '22:00' },
  { name: 'Malam', start_time: '22:00', end_time: '06:00' },
];
```

- Does NOT wipe existing data (unlike dev seeder)
- Upserts based on unique keys (rayon code, area name)
- Area boundaries imported from reference KMZ files
- Creates 1 admin_system + 1 superadmin account with strong passwords from env vars

---

## K. Redis Integration (Sub-Phase 4-1)

### K1. Redis Service

**File:** `be/src/common/services/redis.service.ts`

```typescript
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async get(key: string): Promise<string | null>;
  async set(key: string, value: string, ttl?: number): Promise<void>;
  async del(key: string): Promise<void>;
  async exists(key: string): Promise<boolean>;
  async isHealthy(): Promise<boolean>;
}
```

### K2. Cache Usage Points

| Cache Key Pattern | TTL | Purpose | Service |
|-------------------|-----|---------|---------|
| `monitoring:thresholds` | 60s | Monitoring config thresholds | MonitoringCacheService |
| `monitoring:staffing:{areaId}` | 30s | Area staffing summary | MonitoringService |
| `auth:role:{userId}` | 30s | User role for JWT validation | JwtStrategy |
| `auth:blacklist:{tokenHash}` | variable | Revoked refresh tokens | AuthService |
| `shift-reminder:{date}:{userId}` | 24h | Dedup shift reminders | ShiftReminderCron |
| `import:{sessionId}` | 1h | CSV import session data | ImportService |

**Cache invalidation rules:**
- `auth:role:{userId}`: invalidate (`DEL`) in `UsersService.update()` when `role` or `is_active` changes
- **Security note:** stale role cache is a security risk — user demoted but still has elevated access for up to TTL duration. TTL reduced from 300s to 30s. Consider removing this cache entirely since JWT already contains role claim.

---

## L. Testing Guidance for Phase 4 Features

### L1. FCM Testing

Mock `NotificationsService.sendToUser()` at the service boundary — never call the real FCM SDK in unit or integration tests:

```typescript
const mockNotificationsService = {
  sendToUser: jest.fn().mockResolvedValue(undefined),
};

// In tests: verify the method was called with correct args
expect(mockNotificationsService.sendToUser).toHaveBeenCalledWith(
  expectedUserId,
  'task_assigned',
  expect.objectContaining({ title: expect.any(String), body: expect.any(String) }),
);
```

For preference-check integration tests, use an in-memory `notification_preferences` repository to avoid DB setup.

### L2. Sentry Testing

Use an empty DSN in test environments so Sentry is effectively disabled:

```typescript
// jest.config.ts or test setup
process.env.SENTRY_DSN = '';
```

This prevents Sentry SDK from making HTTP calls during tests while keeping the import chain intact. Do NOT mock the `@sentry/node` module globally — use empty DSN instead.

### L3. Redis Testing

Use `ioredis-mock` for integration tests that exercise Redis-backed features (token blacklist, import sessions, shift reminder dedup):

```typescript
// jest.setup.ts
jest.mock('ioredis', () => require('ioredis-mock'));
```

`ioredis-mock` is in-memory and supports `SET`, `GET`, `DEL`, `EXISTS`, `SET NX EX`, TTL semantics — sufficient for all Phase 4 Redis usage patterns. No real Redis instance required in CI.

### L4. Cron Job Testing

Use `jest.useFakeTimers()` to test time-dependent cron behaviour without waiting for real intervals:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-03-12T02:00:00.000Z')); // 9 AM WIB
});

afterEach(() => {
  jest.useRealTimers();
});

it('should purge location logs older than 90 days', async () => {
  await service.purgeOldLocationLogs();
  expect(mockQueryRunner.query).toHaveBeenCalledWith(
    expect.stringContaining('logged_at < NOW() - INTERVAL'),
    expect.any(Array),
  );
});
```

For shift reminder and stale-status crons, inject the cron service directly in the test and call the handler method manually rather than relying on the `@Cron()` decorator timing.

---

## M. Testing & Coverage Targets

### M1. Coverage Requirements

- New Phase 4 modules: >90% statement coverage target
- Overall project coverage must not drop below current 94.51% statement / 83.49% branch
- Individual module coverage must not drop below 80%

---

## N. Production Seeder Additions

### N1. Default Monitoring Configs

Include default `monitoring_configs` threshold values in production seeder (`seed-production.ts`):

| Config Key | Value | Description |
|-----------|-------|-------------|
| `location_stale_minutes` | 15 | Minutes before location is considered stale |
| `outside_area_threshold_meters` | 100 | Meters outside boundary before flagged |
| `missing_threshold_minutes` | 30 | Minutes before worker marked missing |
| `inactive_threshold_minutes` | 60 | Minutes before worker marked inactive |
| `location_update_interval_seconds` | 300 | Expected interval between location pings |

---

**Last Updated:** 2026-03-12
