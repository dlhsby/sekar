# Architecture Decision Records (ADRs)

Why the significant technical decisions were made. Each ADR follows **Status · Context · Decision · Consequences**. Statuses: **Active**, **Superseded by ADR-XXX**, **Proposed**. To add one: create `ADR-NNN-title.md` (next free number — 020–023 & 039 were skipped), follow the section structure of a recent ADR, and add a row below.

## Index (all 44)

| ADR | Title | Status |
|-----|-------|--------|
| [001](./ADR-001-uuid-primary-keys.md) | Use UUID for All Primary Keys | Active |
| [002](./ADR-002-offline-first-mobile.md) | Offline-First Mobile Architecture | Active |
| [003](./ADR-003-asyncstorage-phase1.md) | AsyncStorage for Phase 1 Offline Queue | Active |
| [004](./ADR-004-jwt-authentication.md) | JWT Authentication with Refresh Tokens | Active |
| [005](./ADR-005-gps-boundary-tolerance.md) | 100m GPS Boundary Tolerance | Superseded by [010](./ADR-010-phase2c-terminology-cleanup.md) |
| [006](./ADR-006-postgresql-partitioning.md) | PostgreSQL Partitioning for Location Logs | Active |
| [007](./ADR-007-react-native-over-flutter.md) | React Native over Flutter | Active |
| [008](./ADR-008-modular-monolith.md) | Modular Monolith over Microservices | Active |
| [009](./ADR-009-phase2c-role-system-overhaul.md) | Phase 2C Role System Overhaul | Active · amended by 032/033 |
| [010](./ADR-010-phase2c-terminology-cleanup.md) | Phase 2C Terminology Cleanup, Schema Redesign & Polygon Geofencing | Active |
| [011](./ADR-011-phase2d-monitoring-status-model.md) | Phase 2D Materialized Status Tracking with Configurable Thresholds | Superseded by [029](./ADR-029-monitoring-v2-event-sourced-redis.md) |
| [012](./ADR-012-phone-number-login.md) | Phone Number Login with Identifier-Based Authentication | Active |
| [013](./ADR-013-multi-area-assignment.md) | Multi-Area Assignment with Junction Table | Active |
| [014](./ADR-014-overtime-clock-in-flow.md) | Overtime as Clock-In/Clock-Out Shift Flow | Active |
| [015](./ADR-015-audit-trail.md) | Generic Audit Trail for Entity Change Tracking | Active |
| [016](./ADR-016-redis-websocket-scaling.md) | Redis for WebSocket Scaling, Caching, and Notification Retry | Active |
| [017](./ADR-017-maestro-mobile-e2e.md) | Maestro for Mobile E2E Testing | Active |
| [018](./ADR-018-export-format-strategy.md) | Export Format Strategy (CSV + Excel via exceljs) | Active |
| [019](./ADR-019-offline-connectivity-model.md) | Two-Tier Offline Connectivity Model | Active |
| [024](./ADR-024-pdf-report-generation.md) | PDF Report Generation — Puppeteer | Active |
| [025](./ADR-025-analytics-materialized-views.md) | Analytics Data Aggregation — Materialized Views | Active |
| [026](./ADR-026-asset-qr-code-strategy.md) | Asset QR Code Strategy | Active |
| [027](./ADR-027-ios-build-distribution.md) | iOS Build & Distribution Strategy | Active |
| [028](./ADR-028-staging-environment.md) | Staging Environment Strategy | Active |
| [029](./ADR-029-monitoring-v2-event-sourced-redis.md) | Monitoring v2 — Event-Sourced Status via Redis Streams + Socket.IO Redis Adapter | Active |
| [030](./ADR-030-area-aggregate-plant-inventory.md) | Area-Aggregate Plant Inventory with Optional Notable-Plant Records | Active |
| [031](./ADR-031-task-typing-and-custom-fields.md) | Task Typing via `task_type` Enum + JSONB `custom_fields` Validated by Per-Type Schema Registry | Active · amended by 038 |
| [032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) | Extend `admin_data` with Disposition Authority over `pruning_requests`, Scoped by `users.rayon_id` | Active |
| [033](./ADR-033-staff-kecamatan-role.md) | New External Role `staff_kecamatan` for Public Pruning Intake | Active |
| [034](./ADR-034-pruning-cycle-prediction.md) | Pruning Cycle Prediction — Species × Area_Type Lookup (No ML), with Manual Override | Active |
| [035](./ADR-035-service-capacity-model.md) | Generic `service_capacity` Model (Rayon × ISO-Week × Service_Type) | Active |
| [036](./ADR-036-design-tokens-single-source.md) | Design Tokens — Single Source of Truth at `specs/design-system/tokens.json` | Palette superseded by [040](./ADR-040-design-system-v2.1.md) |
| [037](./ADR-037-web-pwa.md) | Web becomes an installable PWA (service worker + offline shell + web push) | Active |
| [038](./ADR-038-pruning-workflow-entry-points.md) | Pruning Workflow Entry Points, Activity Tagging, and Task Delegation Audit | Active |
| [040](./ADR-040-design-system-v2.1.md) | Design System v2.1 — sage-primary token re-baseline + pinwheel brand identity | Active |
| [041](./ADR-041-forgot-password-contact-admin.md) | Forgot-password = contact admin (no self-serve reset) | Active |
| [042](./ADR-042-onboarding-flow.md) | First-launch onboarding — pre-login carousel + permissions priming + area preview | Active |
| [043](./ADR-043-production-gap-closure.md) | Production gap-closure decisions — offline sync / push / background location / message broker | Proposed |
| [044](./ADR-044-dynamic-rbac.md) | Dynamic RBAC — data-driven roles, permissions, monitoring scope | Active · amends 009/032/033 |
| [045](./ADR-045-four-level-location-hierarchy.md) | Four-Level Location Hierarchy — Region (Kawasan) + per-level styling | Active · amends 010/013 |
| [046](./ADR-046-monitoring-subject-model.md) | Monitoring Subject Model & Revamp — monitorable vs scheduled, static vs mobile | Active · extends 029 |
| [047](./ADR-047-schedule-redesign.md) | Schedule Redesign — rule-based recurrence + occurrences, calendar, teams | Active · amends 013 |
| [048](./ADR-048-teams.md) | Teams — grouped monitoring subjects with typed markers | Active |
| [049](./ADR-049-settings-architecture.md) | Settings Architecture — personal preferences vs system settings | Active |

## By domain

- **Data & persistence:** [001](./ADR-001-uuid-primary-keys.md) · [006](./ADR-006-postgresql-partitioning.md) · [013](./ADR-013-multi-area-assignment.md) · [025](./ADR-025-analytics-materialized-views.md) · [030](./ADR-030-area-aggregate-plant-inventory.md)
- **Auth & roles:** [004](./ADR-004-jwt-authentication.md) · [009](./ADR-009-phase2c-role-system-overhaul.md) · [012](./ADR-012-phone-number-login.md) · [032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) · [033](./ADR-033-staff-kecamatan-role.md) · [041](./ADR-041-forgot-password-contact-admin.md) · [042](./ADR-042-onboarding-flow.md) · [044](./ADR-044-dynamic-rbac.md)
- **Location, scheduling & teams:** [045](./ADR-045-four-level-location-hierarchy.md) · [047](./ADR-047-schedule-redesign.md) · [048](./ADR-048-teams.md)
- **Settings & config:** [049](./ADR-049-settings-architecture.md)
- **Mobile & offline:** [002](./ADR-002-offline-first-mobile.md) · [003](./ADR-003-asyncstorage-phase1.md) · [007](./ADR-007-react-native-over-flutter.md) · [017](./ADR-017-maestro-mobile-e2e.md) · [019](./ADR-019-offline-connectivity-model.md) · [027](./ADR-027-ios-build-distribution.md)
- **Realtime & monitoring:** [011](./ADR-011-phase2d-monitoring-status-model.md) · [016](./ADR-016-redis-websocket-scaling.md) · [029](./ADR-029-monitoring-v2-event-sourced-redis.md) · [046](./ADR-046-monitoring-subject-model.md)
- **Attendance & geo:** [005](./ADR-005-gps-boundary-tolerance.md) · [006](./ADR-006-postgresql-partitioning.md)
- **Work, pruning & capacity:** [010](./ADR-010-phase2c-terminology-cleanup.md) · [014](./ADR-014-overtime-clock-in-flow.md) · [015](./ADR-015-audit-trail.md) · [018](./ADR-018-export-format-strategy.md) · [024](./ADR-024-pdf-report-generation.md) · [026](./ADR-026-asset-qr-code-strategy.md) · [031](./ADR-031-task-typing-and-custom-fields.md) · [034](./ADR-034-pruning-cycle-prediction.md) · [035](./ADR-035-service-capacity-model.md) · [038](./ADR-038-pruning-workflow-entry-points.md)
- **Platform & infra:** [008](./ADR-008-modular-monolith.md) · [028](./ADR-028-staging-environment.md) · [037](./ADR-037-web-pwa.md) · [043](./ADR-043-production-gap-closure.md)
- **Design system:** [036](./ADR-036-design-tokens-single-source.md) · [040](./ADR-040-design-system-v2.1.md)

## Superseded / amended

- **005 → 010** — hard 100 m GPS radius replaced by soft polygon geofencing.
- **011 → 029** — materialized status tracking replaced by event-sourced Redis Streams.
- **036 palette → 040** — design-token palette re-baselined (sage-primary + pinwheel).
- **009 amended by 032, 033 & 044** — admin_data pruning disposition; external staff_kecamatan role; then data-driven RBAC (roles/permissions/scope).
- **031 amended by 038** — task typing extended with pruning workflow entry points.
- **010 & 013 amended by 045** — 3-level spatial model gains a Region (Kawasan) tier + per-level styling.
- **013 amended by 047** — template-derived roster → rule-based recurring events materialized into occurrences.
- **029 extended by 046** — event-sourced status gains the monitorable-vs-scheduled subject model + static/mobile.

**Related:** [system-overview](../system-overview.md) · [tech-stack](../tech-stack.md) · [features](../../features/README.md)
