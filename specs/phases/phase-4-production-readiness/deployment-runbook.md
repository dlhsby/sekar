# Deployment Runbook — Phase 4

**Status:** Draft (Phase 4 M1, 2026-05-23)
**Audience:** Release engineer on duty
**Scope:** Backend (NestJS) + Mobile (React Native, Android first) + Web (Next.js) + PostgreSQL + Redis
**Companion checklist:** [`status_deployment_checklist.md`](./status_deployment_checklist.md) — sign off line-by-line; this runbook tells you *how* to satisfy each line.

> This runbook is **append-only**. When a step breaks in practice, capture the symptom and the fix in §9 "Lessons" rather than rewriting upstream sections — future-you needs to see what changed and why.

---

## 1. Pre-deploy checklist

Run this list within the 24 h preceding any production deploy. Block the deploy on any unchecked item.

- [ ] **Tag** — `git tag -a vX.Y.Z -m "..."` matches the release notes. The tag SHA is what gets deployed.
- [ ] **DB backup** — `pg_dump` against production captured to the off-host snapshot bucket. Confirm size and timestamp.
- [ ] **Migration dry-run** — `npm run migration:show` against a staging clone of production data lists exactly the migrations expected. No surprises.
- [ ] **Env vars** — staging + production secrets contain every key added since the last deploy. Diff `be/.env.example` against the live secret store.
  - Phase 4 additions: `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `BULLMQ_PREFIX`, `BULLMQ_FCM_RETRY_ATTEMPTS`, `BULLMQ_FCM_RETRY_BACKOFF_MS`, `AUTH_LOGIN_THROTTLE_LIMIT`, `AUTH_LOGIN_THROTTLE_TTL`.
- [ ] **Sentry release** — `SENTRY_RELEASE` set to the new git SHA *before* the deploy starts. Otherwise the first 5 min of errors land on the previous release.
- [ ] **Infra health** — Redis reachable from the API host (`redis-cli -u $REDIS_URL ping` → `PONG`). PostgreSQL accepting connections. S3 bucket reachable.
- [ ] **CI green** — `mobile-quality.yml`, backend test job, and `tokens:verify` all green on the tagged SHA.
- [ ] **Maintenance window** — communicated in the release channel ≥1 h before deploy. Set window length to **2×** the expected deploy time.
- [ ] **Rollback artifact** — the previous release's container image (backend) and APK (mobile) are still in the registry / artifact store. Note their identifiers in the release ticket.

---

## 2. Backend deploy

```bash
# On the build host
cd be
npm ci
npm run build
SENTRY_RELEASE=$(git rev-parse --short HEAD)
export SENTRY_RELEASE
```

1. **Run migrations** against production: `npm run migration:run`.
   - If a migration fails, **stop immediately**. Do not retry blindly. Capture the error and run the rollback path (§5).
2. **Swap traffic** to the new revision (blue/green or rolling, per environment).
3. **Liveness probe** — `curl -fsS https://api.sekar.wahyutrip.com/health/live` returns `{ status: "ok", uptimeSec: … }` within 10 s.
4. **Readiness probe** — `curl -fsS https://api.sekar.wahyutrip.com/health/ready` returns `status: "ok"` with `checks.db.status = "ok"` and `checks.redis.status = "ok"`. If `status: "degraded"`, do not promote. Inspect `checks.*.error` and §5.
5. **Smoke** — login as a synthetic user, hit `/api/v1/auth/login`, check that the response includes a valid JWT.
6. **Watch Sentry** for 5 minutes. New unique issues with ≥3 events at first occurrence → roll back. Spikes on existing issues → investigate but not necessarily roll back.
7. **Watch logs** for 5 minutes. Look for `level=error` lines tied to the new release tag.

If all green, mark deploy complete in the release ticket. Otherwise §5.

---

## 3. Mobile release (Android first; iOS deferred to Phase 5)

```bash
cd fe/mobile
# 1. Bump version
npm version patch    # or minor/major per change scope
# 2. Build
cd android
./gradlew bundleRelease
```

1. **Source-map upload** — once the build completes, upload source maps to Sentry tagged with the same `SENTRY_RELEASE` the backend uses, or with the platform-specific format `${packageJson.version}+${buildNumber}`. Without this, mobile crashes are unsymbolicated and unactionable.
2. **Internal track** — upload the AAB to Play Console internal testing. Promote to internal testers only.
3. **Smoke** on a physical Android device against staging API:
   - Cold-start launches without crash.
   - Login + clock-in flow completes.
   - Pull-to-refresh works on the monitoring map.
   - Push notification delivered when a task is assigned in the admin web.
4. **Promote** internal → closed beta → production after a 24 h soak in closed beta with no new crash-free-session-rate regression in Sentry.
5. **Web push manifest** — `fe/web/public/manifest.json` `theme_color` must match v2.1 primary `#7FBC8C`. Verified by Lighthouse PWA audit ≥90.

iOS path is identical structurally (EAS Build or Xcode) — out of scope for M1.

---

## 4. Web deploy (Next.js)

```bash
cd fe/web
npm ci
npm run build
npm run start &   # smoke
curl -fsS http://localhost:3000/
```

1. **Lighthouse audit** — score ≥90 on Performance, Accessibility, Best Practices, SEO, PWA. Block deploy on regression >5 points from previous release.
2. **Bundle size** — `next build` summary report shows total JS ≤ 500 KB gzipped per route. Spike → investigate.
3. **Promote** via your hosting platform (Vercel, AWS Amplify, S3+CloudFront, …) per the environment's standard process.
4. **Smoke** — open `https://sekar.wahyutrip.com/`, log in, navigate to monitoring page, verify map renders, verify Redux DevTools / network panel show no console errors.

---

## 5. Rollback

### 5.1 Backend rollback

1. **If migration failed mid-flight**: run `npm run migration:revert` *for the migrations that ran successfully* before the failure. Use `npm run migration:show` to identify which.
2. **If migration succeeded but the new release misbehaves**:
   - Decision tree:
     - **Migration is backwards-compatible** (added column, added table, additive enum) → just swap traffic back to the previous container. The new column sits unused.
     - **Migration is breaking** (dropped column, narrowed type, rename) → DB rollback required. Run `npm run migration:revert` against production *only if the corresponding `down()` was tested*. Otherwise restore from the snapshot taken in §1.
3. **Container rollback** — push the previous image tag, swap traffic. Confirm `/health/ready` green on the rolled-back revision.
4. **Sentry** — mark the failed release as "errored" so the dashboard doesn't conflate.

### 5.2 Mobile rollback

Mobile rollbacks are slower than backend — you can't pull an APK off devices. Options:

- **Server-side feature flag** — disable the feature whose client code crashes. Phase 4 sub-phase 4-3 introduces the feature flag table; until then, use env vars (`FCM_ENABLED`, etc.).
- **Halt promotion** — leave the bad version on the internal track. Affected users: zero (only internal testers).
- **Force-update banner** — push a server-flag that the mobile app polls on each launch, instructing affected versions to update.

### 5.3 Web rollback

Re-promote the previous build via the hosting platform's "redeploy previous" option. Browsers serving the old service-worker may need a cache bust; the PWA manifest's `serviceWorker.scope` plus a version query string handles this.

---

## 6. Verification queries

Use these after every deploy to verify state.

### Database

```sql
-- All migrations should appear, no PENDING
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 10;

-- Migrations are uniquely named (no duplicate timestamps)
SELECT timestamp, COUNT(*) FROM migrations GROUP BY timestamp HAVING COUNT(*) > 1;

-- Active connections vs pool limit
SELECT count(*) FROM pg_stat_activity WHERE datname = 'sekar_db' AND state = 'active';

-- Schema sanity — Phase 3 tables present
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('plant_species','area_plants','notable_plants','pruning_requests','service_capacity','plant_seeds','seed_transactions','kecamatans')
ORDER BY table_name;
```

### Application

```bash
# Liveness
curl -fsS https://api.sekar.wahyutrip.com/health/live

# Readiness — all checks ok
curl -fsS https://api.sekar.wahyutrip.com/health/ready | jq '.status, .checks'

# Throttle is on — 6th login attempt within 60s must 429
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.sekar.wahyutrip.com/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"ratelimittest","password":"x"}'
done   # expect: 401 401 401 401 401 429
```

### Expected log lines (first 60 s after deploy)

- `Nest application successfully started`
- `Listening on port 3000`
- `RedisService: client connected`
- `RedisService: subscriber connected`
- No `level=error` entries unrelated to legitimate user 4xxs.

---

## 7. Environment matrix

| Environment | DB | Redis | S3 | API URL | Sentry env | Notes |
|---|---|---|---|---|---|---|
| **local-dev** | docker-compose `postgres:5432` | docker-compose `redis:16379` | LocalStack `:4566` | `http://localhost:3000` | unset (disabled) | `npm run db:seed` populates test data |
| **staging** | RDS `sekar-staging` | ElastiCache `sekar-staging-redis` | `sekar-media-staging` | `https://staging-api.sekar.wahyutrip.com` | `staging` | Mirrors prod schema, sanitized data |
| **production** | RDS `sekar-prod` | ElastiCache `sekar-prod-redis` | `sekar-media-prod` | `https://api.sekar.wahyutrip.com` | `production` | Backups every 1 h, retained 30 d |

Cross-reference: [`infrastructure.md`](./infrastructure.md), [`../../deployment/local-development.md`](../../deployment/local-development.md), [`../../deployment/credentials-setup.md`](../../deployment/credentials-setup.md).

---

## 8. On-call escalation

| Symptom | Action |
|---|---|
| `/health/ready` returns `db: down` | Check RDS dashboard, restart connection pool if connection-leak suspected |
| `/health/ready` returns `redis: down` | Check ElastiCache, fallback path keeps app live (Socket.IO uses Redis only for fan-out; single-replica works without it) |
| Sentry alert: crash-free session-rate drops below 99% | Triage top issue, decide on rollback within 15 min |
| 5xx rate above 1% sustained 5 min | Roll back backend |
| Login latency p95 above 2 s | Check throttle storms via `grep "ThrottlerException" logs`; inspect DB locks |

---

## 9. Lessons (append-only — record real-world deploy incidents here)

> *Empty until first production incident. Append the date, symptom, root cause, and remediation. Do not redact — future-you needs the full picture.*

---

**Maintenance:** Update this runbook within 24 h of any deploy that surfaces a new failure mode. Submit changes via PR with the release ticket linked.
