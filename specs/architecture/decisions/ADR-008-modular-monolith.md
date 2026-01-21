# ADR-008: Modular Monolith over Microservices

**Date:** 2026-01-09
**Status:** ✅ Accepted
**Deciders:** System Architect, CTO, Backend Team
**Tags:** architecture, backend, scalability

---

## Context

Need to design backend architecture for 500 workers, 30+ areas, with future growth to 2000+ workers. Must decide between monolith, modular monolith, or microservices.

---

## Decision

**Implement a modular monolith in NestJS with clear module boundaries, allowing future extraction to microservices if needed.**

### Architecture

```
sekar-backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication & authorization
│   │   ├── users/         # User management
│   │   ├── areas/         # Area management
│   │   ├── shifts/        # Shift tracking
│   │   ├── reports/       # Work reports
│   │   ├── location/      # GPS tracking
│   │   ├── supervisor/    # Supervisor dashboard
│   │   └── shared/        # Shared services (S3, utils)
│   ├── common/            # Guards, interceptors, decorators
│   └── config/            # Configuration
└── test/                  # E2E tests
```

### Module Independence Rules

1. **No direct imports between modules** (except shared)
2. **Communicate via events** (Phase 2+) or service injection
3. **Each module has own tests** (>80% coverage)
4. **Separate database entities** per module
5. **Clear API boundaries** (`@ApiTags`)

---

## Consequences

### ✅ Positive

**Development Speed:**
- Single codebase, easy to navigate
- Shared code (auth, utils) reduces duplication
- Rapid prototyping in Phase 1

**Operational Simplicity:**
- Single deployment
- Single database (simpler transactions)
- Easier debugging (single log stream)
- Lower infrastructure cost

**Performance:**
- No network overhead between services
- Simpler queries (no distributed transactions)
- Easier to optimize

**Future Flexibility:**
- Can extract modules to microservices later
- Clear boundaries enable gradual migration

### ❌ Negative

**Scaling Limitations:**
- Must scale entire app (can't scale just one module)
- Single point of failure
- Mitigation: Horizontal scaling + load balancer

**Team Coordination:**
- All developers work in same codebase
- Merge conflicts possible
- Mitigation: Clear module ownership, feature branches

**Technology Lock-in:**
- All modules use same framework (NestJS)
- Hard to use different languages per module

---

## Scaling Strategy

### Phase 1-2 (500 workers)
- **Single instance:** t3.medium (2 vCPU, 4GB RAM)
- **Database:** RDS db.t3.small
- **Cost:** ~$50/month

### Phase 3-4 (1000 workers)
- **Horizontal scaling:** 2-3 instances behind ALB
- **Database:** RDS db.t3.medium with read replica
- **Cost:** ~$150/month

### Phase 5+ (2000+ workers)
- **Microservices extraction** if needed:
  - Extract `location` module (high write volume)
  - Separate database for location_logs
  - Event-driven communication

---

## When to Migrate to Microservices

**Triggers:**
1. Single module causes performance bottleneck
2. Need to scale one module independently
3. Team grows beyond 15 developers
4. Different SLA requirements per module

**Migration Path:**
```
1. Extract location module → separate service + DB
2. Use message queue (Redis/RabbitMQ) for events
3. Keep other modules in monolith
4. Gradually extract more if needed
```

---

## Alternatives Considered

### 1. Pure Monolith (No Modules)
**Rejected:** Hard to maintain, spaghetti code, no future flexibility

### 2. Microservices from Day 1
**Rejected:** Overkill for Phase 1, operational complexity, higher cost, slower development

### 3. Serverless (AWS Lambda)
**Rejected:** Cold starts, harder debugging, vendor lock-in, not suitable for long-running background tasks

---

## Implementation

- [x] 10 NestJS modules created
- [x] Clear module boundaries enforced
- [x] Shared module for common services
- [x] Module-level testing (100% coverage)
- [x] API docs with @ApiTags per module
- [x] Single database with clear schema separation

---

**Related ADRs:**
- [ADR-004: JWT Authentication](./ADR-004-jwt-authentication.md)
- [ADR-006: PostgreSQL Partitioning](./ADR-006-postgresql-partitioning.md)

**References:**
- [Modular Monolith Primer](https://www.kamilgrzybek.com/design/modular-monolith-primer/)
- [NestJS Modules](https://docs.nestjs.com/modules)

**Last Updated:** 2026-01-16
