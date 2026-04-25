# Phase 2E: Client Feedback II - Implementation Status

**Status:** ✅ COMPLETE + DEPLOYED (Backend + Web on production, April 25, 2026)
**Last Updated:** April 25, 2026 (deployment confirmed via CI/CD)
**Overall Progress:** 100%
**Branch:** main
**Deployed:** api.sekar.wahyutrip.com + sekar.wahyutrip.com — Backend CI/CD `ab67414` (Apr 25, after stale `shifts.service.spec.ts` test fix unblocked the production pipeline) + Web CI/CD on the same commit chain. Earlier Mar 15 production push intent was blocked by the stale test until the Phase 2E base64 selfie refactor was reconciled with its tests.
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)

---

## Document Structure

### Specification Documents

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview, role matrix, implementation phases | [View](./README.md) |
| **database.md** | Migration SQL, new tables, altered tables, indexes | [View](./database.md) |
| **backend.md** | Entities, services, endpoints, DTOs | [View](./backend.md) |
| **mobile.md** | Screens, components, navigation changes | [View](./mobile.md) |
| **web.md** | Pages, components, monitoring updates | [View](./web.md) |
| **testing.md** | Test scenarios, coverage targets | [View](./testing.md) |

---

## Implementation Progress

### Sub-Phase 2E-1: Phone Number Login ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Add `phone_number` column to users entity | ✅ | varchar(20), unique partial index, nullable |
| Create `identifier` field in LoginDto | ✅ | Replaces `username` field |
| Update AuthService login logic | ✅ | Dual lookup: phone pattern detection + OR query fallback |
| Update CreateUserDto / UpdateUserDto | ✅ | Phone validation with `@Matches(/^(\+62\|0)[0-9]{8,13}$/)` |
| Update UsersService for phone_number | ✅ | Unique validation, CRUD |
| Mobile: Update LoginScreen | ✅ | Label "Username / No. HP", identifier field |
| Web: Update login page | ✅ | Zod schema updated, identifier field |
| Unit tests for auth changes | ✅ | 1204 backend tests passing |

### Sub-Phase 2E-2: Profile Picture Upload ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Add `profile_picture_url` column to users entity | ✅ | text, nullable |
| Create profile picture upload endpoint | ✅ | `POST /users/:id/profile-picture` with FileInterceptor |
| Storage: base64 data URI (not S3 URL) | ✅ | **Mar 15 fix**: Buffer converted to `data:image/jpeg;base64,...` directly. S3 upload removed from `UsersController` — LocalStack URL (`http://localhost:4566/...`) is inaccessible from physical devices |
| Mobile: uploadProfilePicture API | ✅ | `usersApi.ts` — native fetch + FormData with auth token |
| Mobile: EditProfileScreen | ✅ | New screen: camera/gallery picker, preview, upload, Redux update |
| Mobile: Wire EditProfile navigation | ✅ | Stack screen in MainNavigator, "Edit Profil" in ProfileScreen menu |
| Unit tests for upload endpoint | ✅ | Updated Mar 15 to expect base64 response, no S3 mock |

### Sub-Phase 2E-3: Multi-Area Assignment ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `user_areas` table and entity | ✅ | Junction table with assignment_type (permanent/task_based) |
| Create UserAreasService | ✅ | getEffectiveAreas, getPermanentAreaIds, assignAreas, removeAssignment |
| Create UserAreasController endpoints | ✅ | GET/POST/DELETE for user areas + GET area users |
| Update korlap area assignment logic | ✅ | Multiple permanent areas via user_areas |
| Update monitoring filters for multi-area korlap | ✅ | Async scope enforcement in MonitoringController |
| Seed multi-area assignments | ✅ | korlap_bungkul + korlap1 demo data |
| Unit tests for multi-area logic | ✅ | |

### Sub-Phase 2E-4: Monitoring Hierarchy Changes ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Add `rayon_id` to UserTrackingStatus entity | ✅ | UUID FK to rayons, nullable |
| Update MonitoringController scope enforcement | ✅ | enforceScopeArea/applyScopeFilters async, multi-area for korlap |
| Update StatusCalculatorService for rayon tracking | ✅ | onClockIn sets rayon_id for admin_data/kepala_rayon |
| Update EventsGateway for multi-area korlap | ✅ | UserAreasService injected, joins all assigned area rooms |
| Unit tests for hierarchy changes | ✅ | |

### Sub-Phase 2E-5: Admin Data + Kepala Rayon Clockable ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Expand CLOCKABLE_ROLES constant | ✅ | Added admin_data, kepala_rayon |
| Expand OVERTIME_SUBMITTERS constant | ✅ | Added kepala_rayon |
| Update ShiftsService for rayon-level clock-in | ✅ | getActiveArea uses rayon boundary for admin_data/kepala_rayon |
| Unit tests for clockable expansion | ✅ | |

### Sub-Phase 2E-6: Overtime Flow Redesign ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Add `is_overtime` flag to shifts entity | ✅ | boolean, default false |
| Add `shift_id` FK to overtimes entity | ✅ | UUID, nullable |
| Add `IN_PROGRESS` to OvertimeStatus enum | ✅ | |
| Make end_datetime, activity_type_id, description nullable | ✅ | Set on end, not start |
| Create overtime clock-in endpoint | ✅ | `POST /overtime/start` |
| Create overtime clock-out endpoint | ✅ | `POST /overtime/end` with activity submission |
| Create active overtime endpoint | ✅ | `GET /overtime/active` |
| Fix CHECK constraint to include `in_progress` | ✅ | Migration 1741400000000 — was causing runtime violation |
| Overtime shift_definition_id = null | ✅ | **Mar 15 fix**: `ShiftsService.clockIn()` skips `findCurrentShiftDefinition()` when `isOvertime=true`; overtime shifts no longer tagged with regular shift definitions (e.g. "Shift 1") |
| Selfie capture uses `mediaService.capturePhoto` | ✅ | **Mar 15 fix**: `OvertimeSubmitScreen` changed from `launchCamera({includeBase64:true})` to `mediaService.capturePhoto(true)` — returns `Photo` with `file://` URI; base64 conversion only at upload time. Fixes white selfie preview |
| Selfie storage: base64 (not S3 URL) | ✅ | **Mar 15 fix**: `ShiftsService` removed S3 upload for selfies; `clock_in_photo_url`/`clock_out_photo_url` store base64 data URI directly. Fixes selfie showing white in `OvertimeDetailScreen` |
| Mobile: startOvertime/endOvertime/getActiveOvertime API | ✅ | Added to overtimeApi.ts |
| Mobile: OvertimeStatus IN_PROGRESS, Shift.is_overtime types | ✅ | Updated models.types.ts |
| Mobile: Fix StartOvertimeRequest type | ✅ | Added `reason: string`; removed wrong `activity_type_id?`/`description?` |
| Mobile: Fix EndOvertimeRequest type | ✅ | Made `activity_type_id`, `description`, `photo_urls` required |
| Mobile: Rewrite OvertimeSubmitScreen | ✅ | Two-state flow (start/end) per ADR-014; elapsed timer, activity picker, photos |
| Mobile: OvertimeDetailScreen pull-to-refresh | ✅ | **Mar 15**: `RefreshControl` on ScrollView; `fetchDetail(isRefresh)` avoids navigation on refresh error |
| Mobile: OvertimeDetailScreen trail access | ✅ | **Mar 15**: `canViewTrail` restricts to non-satgas/linmas roles — API `GET /monitoring/users/:id/location-history` only allows korlap+ |
| Mobile: OvertimeTrailModal improvements | ✅ | **Mar 15**: refresh button; all intermediate markers (blue); zoom in/out FABs; marker deduplication (15m threshold + excludes points within 15m of end marker); callout format: worker name first, "Waktu: 15 Maret 2026 10:44:34", "GPS: -7.xxx, 112.xxx", "Area: Di Dalam Area (Nama Area) / Di Luar Area" |
| Unit tests for overtime flow | ✅ | |

### Sub-Phase 2E-7: Optional Selfie ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Make selfie optional in ClockInDto | ✅ | @IsOptional() decorator |
| Selfie storage: base64 not S3 | ✅ | **Mar 15 fix**: `ShiftsService.clockIn/clockOut()` stores `dto.selfie_photo` (base64 string) directly. No S3 upload — was causing white image on physical devices when LocalStack URL returned |
| Mobile: `useClockInOut` selfie capture | ✅ | **Mar 15 fix**: changed from `launchCamera` to `mediaService.capturePhoto(true)` → `Photo` object; `selfie: Photo\|null` state (was `selfieUri: string\|null`); base64 only at upload via `mediaService.convertToBase64(selfie)` |
| Mobile: `ClockInOutScreen` selfie display | ✅ | Uses `selfie.uri` (`file://`) instead of base64 string — renders correctly |
| Mobile: Remove mandatory selfie guard in useClockInOut.ts | ✅ | Removed alert block + conditional base64 encode |
| Mobile: Make selfie_photo optional in ClockInRequest type | ✅ | `string` → `string?` in api.types.ts |
| Mobile: Make selfie param optional in shiftsApi.ts | ✅ | Only included in payload when truthy |
| Unit tests for optional selfie | ✅ | |

### Sub-Phase 2E-8: Audit Trail ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `audit_logs` table and entity | ✅ | entity_type, entity_id, action, actor_id, old/new value JSONB |
| Create AuditLogService | ✅ | log(), getEntityHistory(), getActorHistory() |
| Create AuditLogController | ✅ | GET /audit-logs with filters, admin-only |
| Integrate in TasksService | ✅ | create, assign, complete, verify, request_revision |
| Integrate in ActivitiesService | ✅ | create, approve, reject |
| Integrate in OvertimeService | ✅ | start, end, approve, reject |
| Integrate in ShiftsService | ✅ | clockIn, clockOut |
| Mobile: AuditLog type | ✅ | Added to models.types.ts |
| Unit tests for audit logging | ✅ | |

### Database Migration + Seeder ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Write migration for all schema changes | ✅ | Migration 1741200000000-Phase2EClientFeedback |
| Drop legacy `phone` column | ✅ | Migration 1741300000000-DropLegacyPhoneColumn (copies → drops) |
| Fix CHECK constraint + add missing FKs + indexes | ✅ | Migration 1741400000000-FixIndexesAndConstraints (13 indexes, 1 FK, 1 CHECK) |
| Update seed-phase2.ts with phone numbers | ✅ | All 30 users with phone_number (phone_number column, not legacy phone) |
| Fix seed INSERT column: `phone` → `phone_number` | ✅ | Prevents login failure for seeded phone numbers |
| Seed multi-area assignments | ✅ | korlap_bungkul, korlap1 demo data |
| Add test user summary to seeder console output | ✅ | Grouped by rayon, shows username/phone/area |
| All backend tests passing | ✅ | |

---

## Test Coverage

| Component | Previous | After 2E | Notes |
|-----------|----------|----------|-------|
| Backend | 62 suites, 1,204 tests (94.55%) | **66 suites, 1,264 tests (94.51% stmts)** | +4 suites, +60 tests |
| Mobile | 3,669 tests | Types + API + screens updated | LoginScreen, ClockInOut, OvertimeSubmitScreen, EditProfileScreen |
| Web | 505 unit tests | Auth tests updated | Login page + auth context tests fixed |

### New Test Files Added
- `audit.service.spec.ts` — 10 tests (100% coverage)
- `audit.controller.spec.ts` — 5 tests (100% coverage)
- `user-areas.service.spec.ts` — 15 tests (100% coverage)
- `user-areas.controller.spec.ts` — 5 tests (100% coverage)
- `overtime.service.spec.ts` — 14 new tests for startOvertime/endOvertime/getActiveOvertime (88.88% coverage)
- `users.controller.spec.ts` — 6 new tests for profile picture upload

---

## Key Changes Summary

| Area | Changes |
|------|---------|
| **New Tables** | `user_areas`, `audit_logs` |
| **Altered Tables** | `users` (+phone_number, +profile_picture_url), `shifts` (+is_overtime), `overtimes` (+shift_id, nullable fields, IN_PROGRESS status), `user_tracking_status` (+rayon_id) |
| **New Module** | UserAreasModule, AuditModule |
| **New Endpoints** | POST /users/:id/profile-picture, GET/POST/DELETE user areas, POST /overtime/start, POST /overtime/end, GET /overtime/active, GET /audit-logs |
| **Auth** | identifier-based login (username or phone_number) |
| **Monitoring** | Async scope enforcement, multi-area korlap, rayon_id tracking |
| **Roles** | CLOCKABLE_ROLES expanded (admin_data, kepala_rayon) |

---

## Known Gaps (Future Phase Scope)

These are NOT bugs — they are features that were out of scope for Phase 2E:

1. **Web: Multi-area korlap UI** — Backend supports multi-area assignment via `user_areas` table with `UserAreasController` endpoints. Web user management form only shows single `area_id` dropdown. Needs multi-select UI in user create/edit forms.
2. **Web: Audit trail page** — Backend `AuditModule` fully implemented with `AuditLogController` (entity history, actor history, paginated queries with filters). No web dashboard page exists to browse/search audit logs. Recommended for Phase 3 or Phase 4.
