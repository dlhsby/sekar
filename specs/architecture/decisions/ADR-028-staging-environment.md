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

**Last Updated:** 2026-03-13
