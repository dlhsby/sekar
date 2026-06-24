# ADR-028: Staging Environment Strategy

**Date:** March 13, 2026
**Status:** Accepted
**Deciders:** Technical Lead, DevOps Engineer
**Related:** Phase 4 Sub-Phase 4-5 (Release & Deployment)

---

## Context

SEKAR currently deploys directly from main branch to production. Phase 4 adds significant new features (reporting, analytics, assets, iOS) that require thorough testing before production deployment. We need a staging environment to validate features, run E2E tests, and get stakeholder approval before production release.

## Decision Drivers

- **Risk reduction** — Catch issues before they reach production
- **Stakeholder review** — DLH can preview features before go-live
- **E2E testing** — Automated tests need a stable target environment
- **Cost** — Minimize infrastructure cost for staging
- **Parity** — Staging should match production closely

## Decision

### Single Staging Environment

One staging environment that mirrors production:

| Component | Staging | Production |
|-----------|---------|------------|
| Backend | EC2 t3.small (shared or separate) | EC2 t3.medium |
| Database | sekar_staging_db (same server or separate RDS) | sekar_db |
| Redis | Same instance, DB 1 | Same instance, DB 0 |
| S3 | sekar-media-staging (separate bucket) | sekar-media-prod |
| Web | Vercel Preview (staging.sekar.wahyutrip.com) | Vercel Production |
| Sentry | Separate project | Separate project |
| Domain | api-staging.sekar.wahyutrip.com | api.sekar.wahyutrip.com |

### Deployment Flow

```
Developer → PR → CI Tests → Merge to main
                                  │
                                  ▼
                          Auto-deploy to Staging
                                  │
                                  ▼
                          E2E Tests on Staging
                          Stakeholder Review
                                  │
                                  ▼
                          Manual Approval Gate
                                  │
                                  ▼
                          Deploy to Production
```

### Data Strategy

- Staging uses a **subset of production data** (anonymized)
- Seed script creates consistent test data
- Staging database is reset weekly (Sunday 03:00 WIB)
- Sensitive data (real names, phone numbers) replaced with fake data

## Alternatives Considered

### No Staging (Current State — Rejected)

Direct deployment to production. Rejected because Phase 4 scope is too large to deploy without pre-production validation.

### Multiple Environments (Dev + Staging + Production — Rejected)

Three environments. Rejected for cost reasons — a separate dev environment is unnecessary since developers run locally. Staging + Production is sufficient.

### Docker Compose Staging (Rejected)

Run staging entirely in Docker on the same server. Rejected because Docker adds resource overhead and complicates debugging compared to a native deployment that matches production exactly.

## Consequences

- **Positive:** Catch issues before production, stakeholder preview, E2E test target
- **Negative:** Additional infrastructure cost (~$10-20/month for shared staging)
- **Mitigation:** Use smallest viable instance (t3.small), share Redis instance

---

## Addendum (2026-06-18) — Implemented topology supersedes the original plan

The staging environment was (re)built on AWS with a **different topology** than planned
above, and production was re-scoped. The deltas below are now authoritative; the original
table/flow are retained for history.

### Environment split
- **Production → on-prem (pemkot) server**, Docker Compose, **platform-agnostic** (Windows
  Server *or* Linux). Self-hosted full stack (Postgres + Redis + MinIO + reverse proxy). Not on AWS.
- **Staging / UAT → AWS**, sole tenant (SEKAR-only as of 2026-06) on a single `t3.micro` EC2 (dlhsby box).

### Staging implementation (as built)
| Aspect | Original plan | As implemented (2026-06) |
|--------|---------------|----------------|
| Compute | EC2 t3.small, native | EC2 **t3.micro** (Docker Compose, sole tenant as of 2026-06); EBS grown to 30 GB + 4 GB swap |
| **Docker Compose staging** | *Rejected* | **Adopted** — `infra/compose.staging.yml` (backend + web + Redis) |
| Web hosting | Vercel Preview | **Container on the box**, fronted by SEKAR's own Caddy |
| Edge / TLS | — | **SEKAR-owned Caddy** service (`sekar-caddy`) via shared external `edge` network; **HTTPS (Let's Encrypt)** (Caddyfile at `infra/Caddyfile.staging`) |
| Domains | `api-staging` / `staging` | **`api.sekar.wahyutrip.com`** / **`sekar.wahyutrip.com`** (canonical names; staging holds them until a dedicated prod takes over) |
| Database | `sekar_staging_db` | **`sekar_staging`** db + `sekar` role on the **shared** RDS (`dlhsby`, formerly `kobin-kpi-db`), SSL required |
| Redis | Same instance, DB 1 | **In-stack `redis:7-alpine` container** (ElastiCache avoided — new-account Free Tier is credit-based) |
| S3 | `sekar-media-staging` | `sekar-media-staging` — via the **EC2 instance role**, no static keys |
| Secrets | — | **SSM Parameter Store** (SecureString `/sekar/staging/*`) → `/opt/sekar/.env` at deploy |
| Deploy | — | GitHub Actions **OIDC → ECR → SSM** (`.github/workflows/deploy-staging.yml`); no SSH |

Rationale: keep UAT lean by running on a shared RDS (cost-effective), with SEKAR-owned
EC2 and Caddy (sole tenant as of 2026-06 after KPI decommissioning). Instance-role S3,
Parameter-Store secrets, SHA-pinned rollback, per-container memory limits, pre-deploy RDS
snapshot, gated migration.
Full runbook: `specs/deployment/deployment-guide.md` §"AWS staging".

---

**Last Updated:** 2026-06-18
