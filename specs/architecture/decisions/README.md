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

**Last Updated:** 2026-03-03
**Maintained By:** System Architect
