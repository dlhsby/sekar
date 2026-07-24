# Attendance

**Status:** ✅ Active · **Backend:** `activities` (clock events) · **Key ADRs:** ADR-002 (offline-first), ADR-005→010 (polygon geofencing), ADR-014 (overtime clock flow)

## Overview
Clock-in / clock-out with mandatory photo evidence and GPS validation against the assigned location's polygon. Works offline and syncs when connectivity returns.

## Key decisions
- **Soft polygon geofencing** (ADR-005→010) — replaced the hard 100 m radius; inside/near/outside is advisory, not blocking.
- **Offline-first** (ADR-002) — clock events queue locally (AsyncStorage) and sync.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** attendance/activity log views — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Clock In/Out, Attendance list & detail — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [scheduling](../scheduling/README.md)
- [monitoring](../monitoring/README.md)
- [work](../work/README.md)

## Changelog
- 2026-07-24 — **Scope-aware geofencing + clock-in card cleanup.** A rayon/kawasan assignment is now geofenced against its OWN boundary polygon (rayon→rayon, kawasan→kawasan, lokasi→lokasi), not treated as "tanpa batas lokasi, attendance always recorded". `useClockInOut` builds a geofence area from `roster.district`/`roster.region.boundary_polygon` (already loaded by `findAllByUserAndDate`; the range query `findByDateRangeForUser` now joins `district` too for parity), so `areaState` reads `within`/`outside` for scoped assignments and only falls back to the neutral `scope` state (fail-open, attendance still recorded) when a scope genuinely has no polygon — labelled "batas area belum ditentukan", not the old misleading copy. UI: the two clock-in cards ("Informasi Kehadiran" + "Lokasi GPS") are merged into one; the duplicated GPS readout (status-row coords + detail block) is collapsed to a single labelled block; and the redundant "Ditugaskan se-Rayon — tanpa lokasi tertentu" line is removed. Note: an emulator's default Jakarta GPS reads LUAR AREA against a Surabaya rayon — set a Surabaya mock location to verify DI AREA.
- 2026-07-23 — **"Lokasi Anda" draws the right boundary, and it matches monitoring.** The map took its area from `currentShift?.area ?? assignedArea` — the ACTIVE clock-in or the *permanent* lokasi — skipping today's roster entirely, so a worker whose schedule sent them somewhere other than their permanent lokasi saw the wrong boundary, or none at all, on the very screen meant to answer "am I in my area?". Priority is now active clock-in → today's roster lokasi → permanent. The polygon is styled from the monitoring palette instead of the pruning-request one and is **tinted by whether the worker is inside it**, so it cannot contradict the badge above it, and the lokasi's own pin is drawn so the area stays identifiable when the worker is far outside it.
- 2026-07-23 — **Clock-in geofences against TODAY'S assignment, and shows all of it.** `useClockInOut` built its geofence from the standing `assignedAreas`, not the roster — so whenever today's assignment differed from the permanent one, clock-in was checked against the wrong lokasi. It now prefers today's roster lokasi, lists **every** covered lokasi when there is more than one ("clock in diterima di salah satu lokasi di atas"), and treats a kawasan/rayon/kota-scope day as boundary-free rather than area-less — the backend resolves the actual lokasi from GPS, expanding the scheduled kawasan.
- 2026-07-23 — **"Jadwal Saya" card on the mobile home.** A worker could not see their own assignment from the home screen at all — today's shift window, scope (lokasi / kawasan / rayon / kota) and team now render in a tappable card that opens the full day view. Shown for clockable roles only; falls back to "Tidak ada jadwal hari ini".
- 2026-07-22 — **Clock-in told the truth about lateness and scope (mobile).** (1) The attendance badge judged lateness from the *first clock-in*, which does not exist yet on the Clock In screen — so a Shift 1 (06:00–15:00) worker opening it at 21:54 was shown **TEPAT WAKTU**. `deriveAttendanceStatus` now projects against **now** ("if I clock in this second, am I late?") and adds an `outside_window` state for a shift whose window has already closed. (2) A **city/rayon/kawasan-scope** schedule names no lokasi, and both the home hero and the clock-in card read that as unassigned — "Anda belum ditugaskan ke area manapun" for a worker assigned across all of Surabaya. New `utils/scheduleScope.ts` `resolveScheduleScope(roster)` (lokasi → kawasan → rayon → city, most specific wins) labels the real scope; only a worker with **no roster row** is called unassigned. (3) **"Jadwal Saya" added to the Menu grid** for every schedulable role — the screen existed but was reachable only from Profil.
- 2026-07-17 — **Fix ad-hoc clock-in 500 (`shifts.location_id` NOT NULL drift).** The `Shift` entity declares `location_id` nullable and `clockIn` explicitly allows an **ad-hoc clock-in with no area** (worker with no schedule + no assigned area; GPS still recorded), but the DB column was created `NOT NULL`, so that path threw a raw not-null constraint error (HTTP 500) instead of recording the shift. Migration `MakeShiftLocationNullable` drops the constraint to match the entity + intent. Behaviour-preserving (all existing shifts have a location); only the previously-impossible ad-hoc insert now succeeds (verified: `POST /shifts/clock-in` for an unassigned worker → 201 with `location_id: null`).
- 2026-07-12 — **Area→Location terminology sweep.** Renamed "assigned location's polygon".
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
