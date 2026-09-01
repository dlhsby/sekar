# SEKAR — Product History

Compact record of what shipped, when, and the decisions behind it. This replaces the old
per-phase spec folders (`specs/phases/`, `specs/status/`) — full detail lives in `git log` and the
linked ADRs. For **current** status see [`../COMPLETION_STATUS.md`](../COMPLETION_STATUS.md); for
per-feature history see each feature's `## Changelog` under [`../features/`](../features/).

> **Going forward** SEKAR is developed as a product, not in phases. Record notable changes in the
> relevant feature spec's `## Changelog` tail. This file is the frozen archive of the phased build
> (Jan–Jun 2026).

## Milestone timeline

| Date | Milestone | Highlights | Key ADRs |
|------|-----------|------------|----------|
| 2026-01-19 | **Phase 1 — MVP** | Auth, clock-in/out with photo, work reports, GPS tracking; backend + mobile core | 001 (UUID), 002 (offline-first), 004 (JWT), 006 (location partitioning), 007 (React Native), 008 (modular monolith) |
| 2026-01-27 | **Phase 2A — Enhanced** | Tasks, notifications, KMZ import, web dashboard foundation | 003 (AsyncStorage queue) |
| 2026-02 | **Phase 2B — UI/UX revamp** | Neo Brutalism 2.0 design system applied across apps | — |
| 2026-02-17 | **Phase 2C — Client feedback** | 8-role system, terminology cleanup, soft polygon geofencing, activities/schedules model | 005→010 (GPS→polygon), 009 (8 roles), 010 (terminology) |
| 2026-03-07 | **Phase 2D — Monitoring** | Five-status live tracking, Google Maps, location history | 011 (materialized status, later superseded) |
| 2026-03-11 | **Phase 2E — Client feedback II** | Phone-number login, multi-area assignment, overtime redesign, audit trail | 012 (phone login), 013 (multi-area), 014 (overtime flow), 015 (audit), 016 (Redis) |
| 2026-06-10 | **Phase 3 — Plants & monitoring rebuild** | Area-aggregate plant inventory, monitoring v2 (event-sourced Redis), typed tasks, pruning intake + kecamatan role, M1-R redesign foundation | 029 (monitoring v2, supersedes 011), 030 (plant inventory), 031 (task typing), 032/033 (pruning roles), 034 (cycle prediction), 035 (service capacity), 038 (pruning workflow) |
| 2026-06-10 | **Phase 4 — Production readiness** | FCM push, export/import, PDF reporting, analytics, E2E suites, security hardening, rebrand (Design v2.1), offline sync, installable PWA, onboarding | 017 (Maestro), 018 (export), 019 (offline model), 024 (PDF), 025 (analytics views), 036→040 (design tokens→v2.1), 037 (PWA), 041 (forgot-password), 042 (onboarding), 043 (gap closure) |
| 2026-06-30 | **Phase 5 — Finishing & iOS** | Reporting polish, analytics, asset management + QR, iOS build prep, staging/UAT hardening | 026 (asset QR), 027 (iOS), 028 (staging) |
| 2026-06-22 | **UAT sign-off** | Staging live on AWS; production (on-prem) pending | — |

## Notes

- **Superseded decisions:** ADR-005→010 (hard GPS radius → soft polygon), ADR-011→029 (materialized
  status → event-sourced Redis), ADR-036→040 (design palette re-baseline). See the
  [ADR index](../architecture/decisions/README.md).
- **Parked features** (built, hidden from web nav 2026-07-07, to revisit): Assets, Analytics,
  Reporting builder/schedules, Import/Export, Seeds. See [`../features/_archived/`](../features/_archived/README.md).
- **Deprecated:** the `supervisor` backend module (superseded by `monitoring`).
