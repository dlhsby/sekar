# Pruning Workflow Redesign Plan (May 2026)

**Source:** Stakeholder clarification, May 1 2026.
**Scope intent:** Make pruning a first-class **activity** with **5 entry points**, decouple activities from tasks, add full delegation audit trail, and switch kecamatan submission to weekly booking.

---

## What we know is already in place (don't rebuild)

| Concern | Status | File / column |
|---------|--------|--------------|
| Activity ↔ task is optional | ✅ already nullable | `activities.task_id` |
| Activity carries pruning fields | ✅ already there | `case_type`, `custom_fields`, `photo_before/after_url`, `reference_code`, `pruning_request_id` |
| Activity creators role gate | ✅ | `[SATGAS, LINMAS, KORLAP, ADMIN_DATA, KEPALA_RAYON]` |
| Task tagging multi-user | ✅ | `task_tags` table + `TaskCreateScreen.taggedUserIds[]` |
| Task hierarchy (partial complete) | ✅ | `parent_task_id`, `target_plant_count`, `completed_plant_count` |
| Service capacity is weekly | ✅ | `service_capacity (rayon_id, year, iso_week, capacity_units, booked_units)` |
| Daily projection in UI | ✅ | `capacityCalendar.projectWeeklyToDaily()` |

## What needs to change

| # | Concern | New work |
|---|---------|----------|
| 1 | **Activity tagging** (korlap creates pruning activity, tags involved satgas/linmas; tagged users see it on their activity feed) | New table `activity_tags`, DTO field `tagged_user_ids[]`, service insert+notify, mobile multi-select on `ActivitySubmissionScreen`, query change so `GET /activities?involving_me=true` returns activities where current user is **assignee OR tagged** |
| 2 | **Task delegation audit** (top-mgmt → kepala_rayon → admin_data → korlap → satgas — full chain) | New table `task_delegations` (task_id, from_user, to_user, action: `assign|delegate|self_assign`, reason, created_at). Hook into existing `POST /tasks/:id/assign`. New `GET /tasks/:id/delegation-history`. Mobile `TaskDetailScreen` renders chain. |
| 3 | **5 pruning entry points documented** (a) kecamatan request, (b–c) task created top-down, (d) self-assigned task with tagging, (e) direct activity without task | Spec/ADR work only — no code change beyond items 1+2. Each path uses existing primitives. |
| 4 | **Kecamatan booking switches to weekly** | Mobile: `AvailabilityCalendar` (day-grid) → `WeekPicker` (week cards with 7 mini per-day chips). DTO: `detail_date` → `expected_year` + `expected_iso_week` (deprecate, don't remove `detail_date` immediately). Backend service: store week, defer day pick to convert; convert chooses first available day in the chosen week, falls back to admin override. Migration: 2 nullable columns; keep `expected_date` for post-convert concrete date. |
| 5 | **End-to-end kecamatan flow verification** | Run through submit → review → convert → satgas activity → done with the new week picker. Fix any bug found. |
| 6 | **Specs / ADRs update** | Amend ADR-031 (task typing), ADR-032 (admin data disposition), ADR-035 (capacity model — note week-booking UX). Update `mobile.md` + `backend.md` + STATUS. |

## Out of scope this turn

- Monitoring map changes (you flagged "stay as is, will review later") — point #9.
- Web `(dashboard)/pruning-requests` admin pages — already deferred to Phase 4.
- ConvertToTaskSheet area/user selectors — already deferred (`areasSlice`/`usersSlice` work).

---

## Suggested phase order

### Phase A — Specs + ADR amendments (0.5 day, lowest risk)
Capture every decision from this conversation in spec files first so subsequent code lands against a written contract.
- Amend `ADR-031-task-typing-custom-fields.md` — note the 5 pruning entry points; clarify that activities are independent.
- Amend `ADR-032-admin-data-pruning-disposition.md` — add the delegation chain section.
- Amend `ADR-035-service-capacity-model.md` — clarify "user picks week, server picks day" rule.
- New ADR: **ADR-038 Pruning workflow entry points + activity tagging + task delegation audit**.
- Update `phase-3-plants-monitoring-rebuild/{backend,mobile,database}.md` with the new entities + endpoints + screens.
- Update `STATUS.md` Manual Review Checklist with new acceptance criteria.

### Phase B — Backend: week-booking + activity_tags + task_delegations (1 day)
1. **Migration** (single TypeORM migration): adds `pruning_requests.expected_year`, `pruning_requests.expected_iso_week`, creates `activity_tags`, creates `task_delegations`. Keeps `pruning_requests.expected_date` for post-convert concrete date.
2. **CreatePruningRequestDto** — add `expected_year`, `expected_iso_week`; keep `detail_date` for one release as deprecated.
3. **PruningRequestsService.create()** — store week fields if provided; skip the past-date validation when only week is given.
4. **PruningRequestsService.convertToTask()** — if request has `expected_year`+`expected_iso_week` and admin didn't override `scheduledDate`, scan Mon-Sun of that ISO week, pick first day where `bookAtomic` succeeds, set as task deadline + `request.expectedDate`.
5. **ActivityTag entity + service hook** — `POST /activities` accepts `tagged_user_ids?: string[]`; service inserts `activity_tags` rows + emits notification (FCM stub).
6. **GET /activities query change** — `?involving_me=true` returns assignee OR tagged. `?tagged_user_id=:id` for filtering by other tagged user.
7. **TaskDelegation entity + service hook** — every `POST /tasks/:id/assign` (and creation with assignee) writes a `task_delegations` row. New `GET /tasks/:id/delegation-history`.
8. **Tests** — service spec coverage for: week-only submit; convert picks first available day; convert fails when whole week is full; activity tag insert; delegation row written on assign; delegation chain returned in order.

### Phase C — Mobile UX (1 day)
1. **Replace** `AvailabilityCalendar` (day-grid grouped by week) with `WeekPicker`:
   - Renders 8 week cards stacked vertically.
   - Each card: week range (e.g. "5 – 11 Mei"), capacity badge, 7 mini per-day chips with color (green=available, yellow=partial, red=full, gray=unknown).
   - Tap card → `onSelect(year, isoWeek)`. Per-day chips are informational only (informational tooltip).
   - Shared with `RescheduleSheet` if admin wants to move a request back to a week — admin still has a date-precision UI elsewhere.
2. **`SubmitScreen` payload change** — `detail_date` → `expected_year`/`expected_iso_week`; copy hint changes from "Pilih tanggal preferensi" to "Pilih minggu preferensi (admin akan menentukan tanggal pasti)".
3. **`ActivitySubmissionScreen`** — add tagged-users multi-select (reuse the `taggedUserIds` UX pattern from `TaskCreateScreen`); only visible when activity-type allows it (initially: all pruning activity types).
4. **`ActivityListScreen`** — include activities where the current user is tagged; mark them with a "Diikutsertakan" subtle badge to distinguish from "Saya yang lapor".
5. **`TaskDetailScreen`** — new collapsible "Riwayat Penugasan" section that calls `GET /tasks/:id/delegation-history` and renders the chain (avatar, name, role, action, timestamp).
6. **Mobile design tokens** — only consume `nbColors`, `nbSpacing`, `NBCard`, `NBBadge`, `NBText`. No raw hex.

### Phase D — End-to-end verification (0.5 day)
Walk every entry point on a real device:

| Entry point | Login chain | Steps to verify |
|-------------|-------------|----------------|
| **a. Kecamatan request** | `staff_kec_pusat` → `admin_data1` → `satgas1` | Submit picks **week**. Admin reviews + converts (server picks Tue of that week, books week, creates task). Satgas executes via `PruningTaskForm`. Activity appears on satgas's `ActivityListScreen`. |
| **b. Top-mgmt → kepala_rayon → admin_data → korlap** | `top_management1` → `kepala_rayon_pusat` → `admin_data1` → `korlap_bungkul` | Each delegation writes a `task_delegations` row. `TaskDetailScreen` "Riwayat" shows all 4 entries. Final korlap completes + reports. |
| **c. Kepala_rayon → korlap directly** | `kepala_rayon_pusat` → `korlap_bungkul` | 1 delegation row. |
| **d. Korlap self-assigns + tags satgas** | `korlap_bungkul` (self) tags `satgas_pusat_1`, `satgas_pusat_2` | `task_tags` rows; satgas sees task on their list with "Tag" pill. |
| **e. Direct activity, no task** | `korlap_bungkul` opens `ActivitySubmissionScreen`, picks pruning type, tags 2 satgas | `activities` row with `task_id=NULL`, 2 `activity_tags`. Tagged satgas see it on their activity feed. |

Capture any 4xx/5xx + UI bugs as a checklist; fix the breaking ones inline; defer minor polish.

### Phase E — Tests + commit (0.5 day)
- Backend: full `npm test` (target ≥ existing coverage on touched modules).
- Mobile: full `npm test` with new `WeekPicker` test, activity tagging test, delegation history test.
- Token tests + ESLint pass.
- Two commits:
  - `feat(pruning): weekly booking + activity tagging + task delegation audit`
  - `docs(phase-3): pruning entry points + ADR-038 + STATUS checklist`

---

## Critical files

| Path | Phase | What it gets |
|------|-------|--------------|
| `specs/architecture/decisions/ADR-038-pruning-workflow-entry-points.md` | A | NEW — 5 entry points, activity tagging, delegation audit |
| `specs/architecture/decisions/ADR-031..ADR-035` (existing) | A | Amendment notes |
| `specs/phases/phase-3-plants-monitoring-rebuild/{backend,mobile,database}.md` | A | New entity tables + endpoints + screens documented |
| `be/src/database/migrations/{timestamp}-week-booking-and-tagging.ts` | B | Adds `expected_year`, `expected_iso_week`, `activity_tags`, `task_delegations` |
| `be/src/modules/pruning-requests/dto/create-pruning-request.dto.ts` | B | Add week fields |
| `be/src/modules/pruning-requests/pruning-requests.service.ts` | B | `create()` + `convertToTask()` logic |
| `be/src/modules/activities/entities/activity-tag.entity.ts` | B | NEW |
| `be/src/modules/activities/dto/create-activity.dto.ts` | B | `tagged_user_ids?` |
| `be/src/modules/activities/activities.service.ts` | B | Tag insert + `?involving_me=true` query |
| `be/src/modules/tasks/entities/task-delegation.entity.ts` | B | NEW |
| `be/src/modules/tasks/tasks.service.ts` | B | Log delegation on assign |
| `be/src/modules/tasks/tasks.controller.ts` | B | `GET /:id/delegation-history` |
| `fe/mobile/src/screens/pruningRequests/components/WeekPicker.tsx` | C | NEW (replaces `AvailabilityCalendar` for kecamatan) |
| `fe/mobile/src/screens/pruningRequests/SubmitScreen.tsx` | C | Use WeekPicker |
| `fe/mobile/src/screens/field/ActivitySubmissionScreen.tsx` | C | Tagged users multi-select |
| `fe/mobile/src/screens/activities/ActivityListScreen.tsx` | C | Include tagged-in activities |
| `fe/mobile/src/screens/taskActivity/TaskDetailScreen.tsx` | C | Riwayat Penugasan section |

---

## Open question for you

Phase A + Phase B + Phase C + D + E together is **~3 dev-days of work**. To keep this session focused and reviewable, I propose to land **Phase A (specs)** and **Phase B + C kecamatan slice (week picker only — items #4, #5, #11, #12)** this turn. **Activity tagging** and **task delegation audit** (items #1, #2, #3, #10) need their own session because they touch 4+ screens and 2 new tables that deserve their own review.

If you'd rather I do everything in one push (and accept the risk of a single huge commit + longer feedback loop), say so and I'll proceed. Otherwise I'll start at Phase A.
