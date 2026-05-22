# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the SEKAR project. ADRs document significant architectural decisions, their context, and consequences.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architecture decision made along with its context and consequences. It provides a historical record of why certain technical decisions were made, which is valuable for:

- Onboarding new team members
- Revisiting decisions when context changes
- Understanding system constraints
- Preventing repeated discussions

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-NNN: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
[What is the issue we're seeing that is motivating this decision?]

## Decision
[What is the change we're proposing/making?]

## Consequences
### Positive
[Benefits of this decision]

### Negative
[Drawbacks or trade-offs]

## Alternatives Considered
[What other options were considered and why were they rejected?]
```

## Index of ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./ADR-001-uuid-primary-keys.md) | Use UUID for All Primary Keys | Accepted | 2026-01-09 |
| [002](./ADR-002-offline-first-mobile.md) | Offline-First Mobile Architecture | Accepted | 2026-01-09 |
| [003](./ADR-003-asyncstorage-phase1.md) | AsyncStorage for Phase 1 Offline Queue | Accepted | 2026-01-16 |
| [004](./ADR-004-jwt-authentication.md) | JWT Authentication with 7-Day Expiration | Accepted | 2026-01-09 |
| [005](./ADR-005-gps-boundary-tolerance.md) | 100m GPS Boundary Tolerance | Accepted | 2026-01-16 |
| [006](./ADR-006-postgresql-partitioning.md) | PostgreSQL Partitioning for Location Logs | Accepted | 2026-01-16 |
| [007](./ADR-007-react-native-over-flutter.md) | React Native over Flutter | Accepted | 2026-01-09 |
| [008](./ADR-008-modular-monolith.md) | Modular Monolith over Microservices | Accepted | 2026-01-09 |
| [009](./ADR-009-phase2c-role-system-overhaul.md) | Phase 2C 8-Role System Overhaul | Accepted | 2026-02-10 |
| [010](./ADR-010-phase2c-terminology-cleanup.md) | Phase 2C Terminology Cleanup | Accepted | 2026-02-10 |
| [011](./ADR-011-phase2d-monitoring-status-model.md) | Phase 2D Materialized Status Tracking with Configurable Thresholds | Accepted | 2026-03-03 |
| [012](./ADR-012-phone-number-login.md) | Phone Number Login (Identifier-Based Auth) | Accepted | 2026-03-10 |
| [013](./ADR-013-multi-area-assignment.md) | Multi-Area Korlap Assignment | Accepted | 2026-03-10 |
| [014](./ADR-014-overtime-clock-in-flow.md) | Overtime Clock-In/Clock-Out Flow Redesign | Accepted | 2026-03-10 |
| [015](./ADR-015-audit-trail.md) | Audit Trail for Entity Revisions | Accepted | 2026-03-10 |
| [016](./ADR-016-redis-websocket-scaling.md) | Redis for WebSocket Scaling, Caching, and Notification Retry | Accepted | 2026-03-12 |
| [017](./ADR-017-maestro-mobile-e2e.md) | Maestro for Mobile E2E Testing | Accepted | 2026-03-12 |
| [018](./ADR-018-export-format-strategy.md) | Export Format Strategy (CSV + Excel via exceljs) | Accepted | 2026-03-12 |
| [019](./ADR-019-offline-connectivity-model.md) | Two-Tier Offline Connectivity Model | Accepted | 2026-03-12 |
| [029](./ADR-029-monitoring-v2-event-sourced-redis.md) | Monitoring v2: Event-Sourced Status via Redis Streams + Socket.IO Redis Adapter | Accepted (supersedes ADR-011) | 2026-04-24 |
| [030](./ADR-030-area-aggregate-plant-inventory.md) | Area-Aggregate Plant Inventory with Optional Notable-Plant Records | Accepted | 2026-04-24 |
| [031](./ADR-031-task-typing-and-custom-fields.md) | Task Typing via `task_type` Enum + JSONB `custom_fields` Validated by Per-Type Schema Registry | Accepted | 2026-04-24 |
| [032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) | Extend `admin_data` with Disposition Authority over `pruning_requests`, Scoped by `users.rayon_id` | Accepted (amends ADR-009) | 2026-04-24 |
| [033](./ADR-033-staff-kecamatan-role.md) | New External Role `staff_kecamatan` for Public Pruning Intake | Accepted (extends ADR-009) | 2026-04-24 |
| [034](./ADR-034-pruning-cycle-prediction.md) | Pruning Cycle Prediction: Species × Area_Type Lookup (No ML), with Manual Override | Accepted | 2026-04-24 |
| [035](./ADR-035-service-capacity-model.md) | Generic `service_capacity` Model (Rayon × ISO-Week × Service_Type) | Accepted | 2026-04-24 |
| [036](./ADR-036-design-tokens-single-source.md) | Design Tokens — Single Source of Truth at `specs/ui-ux/tokens.json` | Accepted | 2026-04-25 |
| [037](./ADR-037-web-pwa.md) | Web Becomes an Installable PWA (Service Worker + Offline Shell + Web Push) | Accepted | 2026-04-25 |
| [040](./ADR-040-design-system-v2.1.md) | Design System v2.1 — sage-primary token re-baseline + pinwheel brand identity | Proposed (supersedes ADR-036 palette) | 2026-05-22 |
| [041](./ADR-041-forgot-password-contact-admin.md) | Forgot-password = contact admin (no self-serve reset) | Proposed | 2026-05-22 |
| [042](./ADR-042-onboarding-flow.md) | First-launch onboarding — pre-login carousel + permissions priming + area preview | Proposed | 2026-05-22 |
| [043](./ADR-043-production-gap-closure.md) | Production gap-closure decisions — offline / push / background location / BullMQ on existing Redis | Proposed | 2026-05-22 |

## How to Create a New ADR

1. Copy `ADR-template.md` to `ADR-NNN-title.md` (increment NNN)
2. Fill in all sections
3. Get review from tech lead and architect
4. Merge to main branch with status "Accepted"
5. Update this README with the new ADR

## Related Documentation

- [System Overview](../system-overview.md)
- [Tech Stack](../tech-stack.md)
- [Business Rules](../../business-rules.md)

**Last Updated:** 2026-05-22 (ADRs 040-043 added for Phase 4 rebrand + UI/UX revamp + production gap-closure)
**Maintained By:** System Architect
