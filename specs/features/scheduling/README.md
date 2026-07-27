# Scheduling

**Status:** ✅ Active (ADR-047 revamp landed — Phase 4) · **Backend:** `shifts`, `shift-definitions`, `schedules` (incl. `schedule_events`), `special-day-overrides`, `service-capacity` · **Key ADRs:** ADR-047 (rule + occurrences), ADR-013 (multi-location), ADR-035 (service capacity)

## Overview
"Jadwal" is rule-driven (ADR-047): a **`ScheduleEvent`** holds recurrence, shift, scope (static location / mobile region), and target (individual or team); a **materializer** expands active events into the per-day `schedules`/`schedule_locations` roster over a rolling horizon, so monitoring reads are unchanged. The web page is a **calendar** (month/week/day) with the datatable as a secondary view. Special-day overrides adjust the roster for holidays; service-capacity models rayon × ISO-week × service-type throughput.

## Key decisions
- **Rule + occurrences** (ADR-047) — `schedule_events` (+ `schedule_event_members`) is the rule layer; `schedule-materializer.service` writes occurrences (`schedules.schedule_event_id` set; NULL = manual/ad-hoc). The **standing-template generator is retired** — migration `17492700000000` converted each active satgas/linmas template (shift + primary location) into an open-ended daily event; `POST /schedules/generate` now materializes events for the date.
- **Rolling horizon** — cron (00:15 + 17:00 WIB + boot self-heal) materializes today + N days (`schedule.materialization_days` system setting, default 30); create/edit materializes in-horizon immediately.
- **Time-based overlap guard** — roster uniqueness is `(user, date, shift)`; a user may hold multiple non-overlapping shifts a day. True time-window overlaps are rejected (shift-3 `crosses_midnight` honored; touching windows allowed). Team fan-out reports conflicted members per-member (`materialization.skipped[]`) and schedules the rest.
- **Calendar edit semantics** — *this occurrence* edits the roster row directly and marks it `is_detached` (never regenerated); *this-and-future* splits the series (old event gets `end_date`, a new event continues); *series* re-materializes future non-detached rows. Deleted occurrences leave soft-delete tombstones the generator never resurrects. Past days are never rewritten.
- **Recurrence UI = Google-Calendar model** — the Buat/Ubah Jadwal form asks for the **date first**, then a single "Pengulangan" select of presets phrased in terms of that date (Tidak berulang *(default)* · Harian · Mingguan pada hari X · Setiap hari kerja · Tanggal tertentu · Kustom…). Interval, weekday set and **`end_date` ("Berakhir") exist only inside the Kustom dialog** — a rule carrying an end date therefore always resolves back to Kustom. Pure mapping in `apps/web/src/lib/schedules/recurrencePresets.ts`; the API contract (`recurrence_type` + `recurrence_config`) is unchanged, and the dialog is shaped to it (days 1–30 → `daily`/`every_n_days`; week → `weekly` weekdays; **no every-N-weeks, no occurrence-count end** — the backend has neither).
- **Occurrences carry `team_id` + `region_id`** so Phase 5 monitoring renders team bubbles / mobile geofences without another migration.
- **Multi-location** (ADR-013) — a roster row can span multiple locations (`schedule_locations`); event-generated static occurrences carry the event's single location.
- **Service capacity** (ADR-035) — generic `service_capacity` model (rayon × ISO-week × service_type); web UI is the rayon capacity weekly grid (`rayons/[id]/capacity`).
- `special-day-overrides` — date · `WEEKEND|HOLIDAY|SPECIAL` · name. UI: **Hari Libur** on the Jadwal toolbar (`HolidayManagerModal`, `schedule:create`-gated). Its *only* effect is selecting which `day_type` capacity row applies — it does **not** skip roster generation (the `schedules` module has no holiday awareness). `SPECIAL` resolves identically to `HOLIDAY` and is **no longer offered** in the picker (readable, not creatable). Day type resolves in **WIB** on both sides: backend `DayTypeService` (via `TimezoneUtil`), web `resolveDayType(iso, overrides)`.

## Revamp notes (post-UAT) — ADR-047/048 (landed, Phase 4)
"Jadwal" names the whole process, not one entity. Design (all implemented; see Key decisions):
- **Rule + occurrences** — a `ScheduleEvent` holds recurrence (`none | daily | every_n_days | weekly | specific_dates`), shift, and scope; a generator materializes per-day, per-member **occurrences** into the existing `schedules`/`schedule_locations` roster so monitoring reads are unchanged.
- **Calendar UI** — day/week/month (Google-Calendar-style) for create/edit; datatable becomes secondary.
- **Individual + team** — team events name a PIC + invited members (korlap/satgas/linmas), fanned out to member occurrences ([teams](../teams/README.md)).
- **Static vs mobile scope** — `location_id` (static) or `region_id` (mobile, e.g. penyiraman).
- **Only satgas/linmas** occurrences feed understaffing; korlap optional (never auto-materialized); management/kepala_rayon/admin_rayon need no schedule.
- **Multiple shifts/day allowed** — a user may hold non-overlapping shifts (e.g. shift 1 + shift 2). The **overlap guard is time-based** (rejects true time-window overlaps, honors shift-3 midnight crossing), not one-per-day.
- **Rolling horizon** — a daily cron materializes each active event today + N days forward (`schedule.materialization_days`, default 30); event create/edit materializes in-horizon immediately (no blind full-calendar generation). Edits offer this / this-and-future / series scopes.
- **Occurrence link** — `schedules.schedule_event_id` (nullable FK): set = rule-generated, NULL = manual/ad-hoc.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Schedules page (roster grid); rayon capacity weekly grid (`rayons/[id]/capacity`) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** My Schedule, Shift History — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [overtime](../overtime/README.md)
- [teams](../teams/README.md)
- [monitoring](../monitoring/README.md)

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
