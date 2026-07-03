# Phase 5: Cross-Phase Evaluation Framework

**Date:** June 17, 2026
**Status:** In Progress — feature requirements 11/12/13 delivered (code-side); full perf/coverage audit pending
**Depends On:** All Phase 5 Sub-Phases Complete
**Related Sub-Phase:** 5-7
**Related ADRs:** All (ADR-001 through ADR-028)

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Phases completed | Phase 1 + 2A + 2B + 2C + 2D + 2E + 3 + 4 |
| Backend modules | ~23 (20 Phase 4 + 3 Phase 5) |
| Backend endpoints | ~170 (145 Phase 4 + ~25 Phase 5) |
| Mobile screens | 30 (22 Phase 4 + 8 Phase 5) |
| Web pages | 35 (24 Phase 4 + 11 Phase 5) |
| Database tables | ~31 (24 Phase 4 + 7 Phase 5) |
| ADRs | 28 |
| Specification files | 60+ |

---

## A. Requirements Traceability Matrix

### A1. Original Project Requirements

| # | Requirement | Phase Implemented | Status | Evidence |
|---|-------------|-------------------|--------|----------|
| 1 | User authentication with role-based access | Phase 1 + 2C + 2E | ⬜ Verify | JWT auth, 8-role system, identifier login |
| 2 | Digital clock-in/out with GPS verification | Phase 1 + 2C + 2D | ⬜ Verify | ShiftsService, selfie photo, geofence check |
| 3 | Real-time worker location tracking | Phase 2D | ⬜ Verify | WebSocket events, 5-status monitoring |
| 4 | Task assignment and workflow | Phase 1 + 2B + 2C | ⬜ Verify | Task lifecycle, revision workflow |
| 5 | Activity submission with photo evidence | Phase 1 + 2B | ⬜ Verify | Activity entity, S3 photo upload |
| 6 | Overtime management | Phase 2C + 2E | ⬜ Verify | Clock-in/out flow, approval workflow |
| 7 | Push notifications | Phase 2B + 3 | ⬜ Verify | FCM, 8 trigger points |
| 8 | Supervisor monitoring dashboard | Phase 2D | ⬜ Verify | Web Google Maps + mobile MapDashboard |
| 9 | 7 Rayon organizational structure | Phase 2A | ⬜ Verify | Rayon/area entities, KMZ import |
| 10 | Shift scheduling | Phase 1 + 2C | ⬜ Verify | Schedule entity, shift definitions |
| 11 | Reporting with PDF/CSV/Excel export | Phase 5-1 | ✅ Delivered (code) | `be/src/modules/reporting/` 8 endpoints + puppeteer-core/handlebars PDF (ADR-024) + CSV/XLSX via ExportModule; web `/reports`+builder+schedules; mobile Reports/ReportDetail. BE verified live (generate→S3→download). |
| 12 | Analytics and KPI dashboards | Phase 5-2 | ✅ Delivered (code) | `be/src/modules/analytics/` 7 endpoints + 3 materialized views (ADR-025) + weighted score service; web `/analytics`+workers+areas (Recharts); mobile Worker/TeamAnalytics. BE verified live (refresh + dashboard). |
| 13 | Asset management with QR codes | Phase 5-3 | ✅ Delivered (code) | `be/src/modules/assets/` 14 endpoints + QR service (ADR-026, `SEKAR:{CODE}`, level H); web `/assets` list/detail/new/qr/maintenance; mobile list/detail/QRScanner/checkout/return. BE verified live (QR PNG → MinIO). Mobile on-device QR scan pending (no device). |
| 14 | iOS platform support | Phase 5-4 | ⬜ Verify | Apple Sign-In, biometrics, App Store |
| 15 | Multi-environment deployment | Phase 4 + 5-5 | ⬜ Verify | Staging + production, CI/CD |
| 16 | User documentation | Phase 5-6 | ⬜ Verify | Web + mobile user guides |
| 17 | Offline support | Phase 4 | ⬜ Verify | SyncManager, ConnectivityBanner |

### A2. Non-Functional Requirements

| # | Requirement | Target | Phase | Status | Actual |
|---|-------------|--------|-------|--------|--------|
| NF-1 | API response time (P95) | <500ms | Phase 4 | ⬜ Verify | |
| NF-2 | Analytics endpoint (P95) | <2s | Phase 5 | ⬜ Verify | |
| NF-3 | PDF generation time | <30s | Phase 5 | ⬜ Verify | |
| NF-4 | Concurrent users | 100+ | Phase 4 | ⬜ Verify | |
| NF-5 | Mobile app startup | <3s | Phase 4 | ⬜ Verify | |
| NF-6 | Backend test coverage | >80% stmts | All | ⬜ Verify | |
| NF-7 | Mobile test coverage | >80% stmts | All | ⬜ Verify | |
| NF-8 | Web test coverage | >80% stmts | All | ⬜ Verify | |
| NF-9 | Accessibility | WCAG 2.1 AA | Phase 2B + 3 | ⬜ Verify | |
| NF-10 | Data backup RPO | 24 hours | Phase 5-5 | ⬜ Verify | |

---

## B. Architecture Review

### B1. Architecture Audit Checklist

| Area | Criteria | Status | Notes |
|------|----------|--------|-------|
| **Modularity** | Each module has single responsibility | ⬜ | |
| **Modularity** | No circular dependencies between modules | ⬜ | |
| **Modularity** | Clean separation: controller → service → repository | ⬜ | |
| **API Design** | Consistent REST conventions across all endpoints | ⬜ | |
| **API Design** | Proper HTTP status codes used | ⬜ | |
| **API Design** | All endpoints have Swagger documentation | ⬜ | |
| **Data Layer** | TypeORM entities match database schema | ⬜ | |
| **Data Layer** | All migrations are reversible | ⬜ | |
| **Data Layer** | Proper indexing for common queries | ⬜ | |
| **Auth** | All endpoints have appropriate guards | ⬜ | |
| **Auth** | Role-based access enforced consistently | ⬜ | |
| **Auth** | JWT refresh token rotation working | ⬜ | |
| **WebSocket** | Events properly scoped by room | ⬜ | |
| **WebSocket** | Redis adapter for horizontal scaling | ⬜ | |
| **Caching** | Redis cache with appropriate TTLs | ⬜ | |
| **Error Handling** | Global exception filter catches all errors | ⬜ | |
| **Error Handling** | Error codes documented and consistent | ⬜ | |
| **Logging** | Structured logging with correlation IDs | ⬜ | |

### B2. ADR Compliance

Review each ADR for compliance:

| ADR | Title | Compliant | Notes |
|-----|-------|-----------|-------|
| ADR-001 | NestJS + TypeORM stack | ⬜ | |
| ADR-002 | JWT authentication | ⬜ | |
| ADR-003 | PostgreSQL database | ⬜ | |
| ADR-004 | React Native mobile | ⬜ | |
| ADR-005 | Next.js web | ⬜ | |
| ADR-006 | Neo Brutalism design | ⬜ | |
| ADR-007 | AWS S3 media storage | ⬜ | |
| ADR-008 | WebSocket real-time | ⬜ | |
| ADR-009 | 8-role system | ⬜ | |
| ADR-010 | English code terminology | ⬜ | |
| ADR-011 | Soft delete pattern | ⬜ | |
| ADR-012 | Phone number login | ⬜ | |
| ADR-013 | Multi-area assignment | ⬜ | |
| ADR-014 | Overtime clock-in flow | ⬜ | |
| ADR-015 | Audit trail | ⬜ | |
| ADR-016 | Redis WebSocket scaling | ⬜ | |
| ADR-017 | Maestro mobile E2E | ⬜ | |
| ADR-018 | Export format strategy | ⬜ | |
| ADR-019 | Offline connectivity model | ⬜ | |
| ADR-020 through ADR-023 | Phase 4 decisions | ⬜ | |
| ADR-024 | PDF report generation | ⬜ | |
| ADR-025 | Analytics materialized views | ⬜ | |
| ADR-026 | Asset QR code strategy | ⬜ | |
| ADR-027 | iOS build & distribution | ⬜ | |
| ADR-028 | Staging environment | ⬜ | |

---

## C. Code Quality Review

### C1. Test Coverage Summary

| Component | Phase 1 | Phase 2E | Phase 4 Target | Phase 5 Target | Actual |
|-----------|---------|----------|----------------|----------------|--------|
| Backend stmts | 84.23% | 94.51% | >90% | >90% | ⬜ |
| Backend branches | — | 83.49% | >80% | >80% | ⬜ |
| Mobile stmts | — | 80.31% | >80% | >80% | ⬜ |
| Web stmts | — | 96%+ | >90% | >90% | ⬜ |
| Maestro flows | 0 | 0 | 15+ | 25+ | ⬜ |
| Playwright specs | 0 | 0 | 20+ | 31+ | ⬜ |

### C2. Code Quality Metrics

| Metric | Target | Actual | Tool |
|--------|--------|--------|------|
| ESLint errors | 0 | ⬜ | `npm run lint` |
| TypeScript strict errors | 0 | ⬜ | `npx tsc --noEmit` |
| Circular dependencies | 0 | ⬜ | `madge --circular` |
| Duplicate code | <5% | ⬜ | `jscpd` |
| Max file length | <800 lines | ⬜ | Manual review |
| Max function length | <50 lines | ⬜ | Manual review |
| Console.log in production | 0 | ⬜ | Grep search |
| Hardcoded secrets | 0 | ⬜ | `trufflehog` or manual |

### C3. Security Audit

| Check | Status | Severity | Notes |
|-------|--------|----------|-------|
| SQL injection prevention (parameterized queries) | ⬜ | Critical | |
| XSS prevention (input sanitization) | ⬜ | Critical | |
| Authentication on all protected endpoints | ⬜ | Critical | |
| Role authorization properly enforced | ⬜ | Critical | |
| Rate limiting configured | ⬜ | High | |
| CORS properly configured | ⬜ | High | |
| Helmet.js security headers | ⬜ | High | |
| JWT secret strength | ⬜ | High | |
| Password hashing (bcrypt) | ⬜ | High | |
| File upload validation | ⬜ | Medium | |
| Error messages don't leak internals | ⬜ | Medium | |
| Dependency vulnerabilities | ⬜ | Medium | |

---

## D. Performance Review

### D1. Backend Performance

| Endpoint Category | P50 Target | P95 Target | Actual P50 | Actual P95 |
|-------------------|-----------|-----------|-----------|-----------|
| Authentication | <100ms | <300ms | ⬜ | ⬜ |
| CRUD operations | <200ms | <500ms | ⬜ | ⬜ |
| Analytics dashboard | <500ms | <1000ms | ⬜ | ⬜ |
| Report generation (PDF) | — | <30s | ⬜ | ⬜ |
| Report generation (CSV) | — | <5s | ⬜ | ⬜ |
| WebSocket event delivery | <100ms | <300ms | ⬜ | ⬜ |
| Asset list (500 items) | <300ms | <1000ms | ⬜ | ⬜ |

### D2. Mobile Performance

| Metric | Target | Actual | Method |
|--------|--------|--------|--------|
| App startup (cold) | <3s | ⬜ | Profiler |
| Screen transition | <300ms | ⬜ | Navigation timing |
| FlatList scroll FPS | >55 FPS | ⬜ | React DevTools |
| GPS accuracy | <20m | ⬜ | Field testing |
| Offline sync time | <30s (100 items) | ⬜ | Manual test |
| Memory usage (idle) | <150 MB | ⬜ | Profiler |
| Battery (8h active shift) | <20% drain | ⬜ | Field testing |

### D3. Web Performance

| Metric | Target | Actual | Tool |
|--------|--------|--------|------|
| Lighthouse Performance | >90 | ⬜ | Lighthouse |
| Lighthouse Accessibility | >90 | ⬜ | Lighthouse |
| First Contentful Paint | <1.5s | ⬜ | Lighthouse |
| Largest Contentful Paint | <2.5s | ⬜ | Lighthouse |
| Cumulative Layout Shift | <0.1 | ⬜ | Lighthouse |
| Total Bundle Size | <500 KB (gzip) | ⬜ | `next build` |

### D4. Database Performance

| Query | Target | Actual | Optimization |
|-------|--------|--------|-------------|
| Worker list (100 workers) | <100ms | ⬜ | Index on area_id, role |
| Monitoring status (all) | <200ms | ⬜ | user_tracking_status table |
| Analytics dashboard | <500ms | ⬜ | Materialized views + Redis |
| Report data aggregation | <5s | ⬜ | Pre-computed views |
| Asset search (500 assets) | <100ms | ⬜ | Full-text index on name |

---

## E. Phase-by-Phase Implementation Review

### E1. Phase 1 — MVP

| Deliverable | Spec | Implemented | Gap |
|-------------|------|-------------|-----|
| User CRUD | ✅ | ⬜ | |
| Authentication | ✅ | ⬜ | |
| Clock-in/out | ✅ | ⬜ | |
| Activity submission | ✅ | ⬜ | |
| Basic scheduling | ✅ | ⬜ | |
| Admin dashboard (web) | ✅ | ⬜ | |
| Worker mobile app | ✅ | ⬜ | |

### E2. Phase 2 — Enhanced Features

| Deliverable | Spec | Implemented | Gap |
|-------------|------|-------------|-----|
| 7 Rayon structure (2A) | ✅ | ⬜ | |
| Task workflow (2B) | ✅ | ⬜ | |
| FCM notifications (2B) | ✅ | ⬜ | |
| Real-time monitoring (2D) | ✅ | ⬜ | |
| 8-role system (2C) | ✅ | ⬜ | |
| Overtime redesign (2E) | ✅ | ⬜ | |
| Identifier login (2E) | ✅ | ⬜ | |
| Multi-area korlap (2E) | ✅ | ⬜ | |
| Audit trail (2E) | ✅ | ⬜ | |

### E3. Phase 4 — Production Readiness

| Deliverable | Spec | Implemented | Gap |
|-------------|------|-------------|-----|
| Redis caching | ✅ | ⬜ | |
| Offline sync | ✅ | ⬜ | |
| FCM activation (8 triggers) | ✅ | ⬜ | |
| Export module (CSV/Excel) | ✅ | ⬜ | |
| JWT refresh rotation | ✅ | ⬜ | |
| Maestro E2E (15+ flows) | ✅ | ⬜ | |
| Playwright E2E (20+ specs) | ✅ | ⬜ | |
| Security hardening | ✅ | ⬜ | |
| UI/UX polish | ✅ | ⬜ | |

### E4. Phase 5 — Finishing

| Deliverable | Spec | Implemented | Gap |
|-------------|------|-------------|-----|
| Reporting module (5-1) | ✅ | ⬜ | |
| Analytics module (5-2) | ✅ | ⬜ | |
| Asset management (5-3) | ✅ | ⬜ | |
| iOS platform (5-4) | ✅ | ⬜ | |
| Staging deployment (5-5) | ✅ | ⬜ | |
| User guides (5-6) | ✅ | ⬜ | |
| E2E extension (5-8) | ✅ | ⬜ | |

---

## F. Recommendations

### F1. Technical Debt Items

| # | Item | Severity | Recommendation |
|---|------|----------|----------------|
| 1 | | ⬜ | |
| 2 | | ⬜ | |
| 3 | | ⬜ | |

*To be filled during evaluation.*

### F2. Phase 5 Feature Candidates

| # | Feature | Effort | Priority | Rationale |
|---|---------|--------|----------|-----------|
| 1 | Weather Integration | 2-3 days | Medium | Inform work planning based on weather |
| 2 | Leave/Absence Management | 3-4 days | High | Currently manual, frequently requested |
| 3 | Incident Reporting | 2-3 days | Medium | Track equipment/safety issues |
| 4 | Shift Handover Notes | 1-2 days | Low | Improve shift transitions |
| 5 | In-App Messaging | 5-7 days | Medium | Reduce dependency on external messaging |

### F3. Infrastructure Improvements

| # | Improvement | Effort | Priority |
|---|-------------|--------|----------|
| 1 | Read replica for analytics queries | 2-3 days | Medium |
| 2 | CDN for media assets | 1-2 days | Medium |
| 3 | APM tooling (beyond Sentry) | 2-3 days | Low |
| 4 | Automated canary deployments | 3-5 days | Low |
| 5 | Database connection pooling (PgBouncer) | 1-2 days | Medium |

---

## G. Final Sign-Off

| Role | Reviewer | Status | Date | Grade |
|------|----------|--------|------|-------|
| Technical Lead | | ⬜ Pending | | |
| Backend Engineer | | ⬜ Pending | | |
| Mobile Developer | | ⬜ Pending | | |
| Web Developer | | ⬜ Pending | | |
| QA Engineer | | ⬜ Pending | | |
| Product Owner (DLH) | | ⬜ Pending | | |

### Grading Scale

| Grade | Score | Description |
|-------|-------|-------------|
| A | 90-100 | Exceeds expectations, production-ready |
| B | 80-89 | Meets expectations, minor improvements needed |
| C | 70-79 | Acceptable, several improvements needed |
| D | 60-69 | Below expectations, significant gaps |
| F | <60 | Not acceptable, major rework required |

---

## H. Pre-Implementation Specification Review (March 14, 2026)

This section documents findings from expert review of Phase 5 specifications before implementation begins. Four domain experts reviewed all 18 spec files and 5 ADRs.

### H1. Review Agents Used

| Agent | Scope | Issues Found | Issues Fixed |
|-------|-------|-------------|-------------|
| System Architect | Cross-cutting consistency, ADR alignment, dependency verification | ~25 | 8 |
| Database Engineer | SQL correctness, entity alignment, materialized view accuracy | ~20 | 12 |
| Backend Developer | Endpoint design, DTO patterns, service architecture | ~15 | 1 |
| Mobile Developer | Screen design, navigation, state management | ~10 | 0 |
| **Total** | | **~70** | **21** |

### H2. Critical Fixes Applied

All 21 fixes were applied directly to spec files during the review:

**database.md — Materialized Views (12 fixes):**

| # | Fix | Details |
|---|-----|---------|
| 1 | `tasks.assigned_to` | Was `assignee_id` — does not exist in entity |
| 2 | `IN ('completed', 'verified')` | Was just `'completed'` — misses verified tasks |
| 3 | `start_datetime`/`end_datetime` | Was `clock_in_time`/`clock_out_time` — overtime entity uses different columns |
| 4 | Removed `deleted_at IS NULL` on overtimes | Overtime entity has no soft delete |
| 5 | `area_staff_requirements` table | Was `staff_requirements` — wrong table name |
| 6 | `required_count` column | Was `required_workers` — wrong column name |
| 7 | Uppercase `'WEEKDAY'`/`'WEEKEND'` | Was lowercase — enum uses uppercase values |
| 8 | `deadline` column | Was `due_date` — task entity uses `deadline` |
| 9 | Schedule range query | Was `effective_date = d.date` — schedules span date ranges |
| 10 | `completed_at` column | Was `updated_at` — task entity has `completed_at` for duration |
| 11 | Audit log JSONB filter | Was `status = 'missing'` — audit_logs uses JSONB columns |
| 12 | `GREATEST(0, ...)` for late_minutes | Was raw EXTRACT — early arrivals produced negative values |

**backend.md (1 fix):**

| # | Fix | Details |
|---|-----|---------|
| 13 | QR code format `SEKAR:${assetCode}` | Was `JSON.stringify({code, id, app})` — mismatched ADR-026 |

**ADR-024 (1 fix):**

| # | Fix | Details |
|---|-----|---------|
| 14 | Singleton browser pattern | Was per-request launch — contradicted backend.md |

**ADR-025 (1 fix):**

| # | Fix | Details |
|---|-----|---------|
| 15 | Index name `idx_wpd_user_date` | Was `idx_wpd_worker_date` — column is `user_id` not `worker_id` |

**ADR-026 (1 fix):**

| # | Fix | Details |
|---|-----|---------|
| 16 | Category prefixes AK/AP/KO/PK/PI/PU | Were AK/AP/MP/PK/SP/MB — mismatched database.md seed |

**Cross-file consistency (5 fixes):**

| # | Fix | Details |
|---|-----|---------|
| 17 | Analytics refresh time → 02:00 WIB | Was 05:00 in database.md and backend.md, 02:00 in ADR-025 |
| 18 | Error correction level → `'H'` | Was `'M'` in backend.md, `'H'` in ADR-026 |
| 19 | `puppeteer-core` note added | ADR-024 didn't specify core vs full package |
| 20 | Active assignment constraint | Missing unique index for one-active-assignment-per-asset |
| 21 | `apple_id` migration added | Missing from database.md Phase4AppleSignIn migration |

### H3. Known Gaps (Not Yet Fixed — To Address During Implementation)

**Architecture:**
- Rayon codes in ADR-026 (RU/RT/RS/RB/RG/RP/RK) need verification against actual seed data
- Semaphore library not specified for PDF concurrency limiting — recommend `async-mutex` or `@supercharge/promise-pool`
- No circuit breaker pattern specified for Chromium browser crashes during PDF generation
- Asset category prefixes in assets.md may still reference old values in some subsections

**Backend:**
- ReportSchedule cron execution strategy not detailed — should use `@nestjs/schedule` `CronExpression`
- Analytics cache invalidation after materialized view refresh should use Redis key patterns, not `DEL analytics:*`
- Asset assignment history endpoint not specified — only current assignment shown
- Bulk QR code generation endpoint missing for batch asset onboarding

**Mobile:**
- QR scanner fallback for devices without camera permission not specified
- Asset offline cache strategy not detailed — should sync asset list on app startup
- Report PDF viewer component not specified — recommend `react-native-pdf` or WebView
- Analytics chart library not specified — recommend `victory-native` or `react-native-chart-kit`

**Web:**
- Report builder drag-and-drop UI complexity may need phased approach
- Analytics dashboard real-time refresh strategy not specified (polling vs WebSocket)
- Asset maintenance calendar view UI framework not specified

**iOS:**
- Apple Sign-In server-side token verification endpoint needs Apple Developer account setup documentation
- App Store screenshot requirements and marketing materials not covered
- Minimum iOS version not specified — recommend iOS 15+

**Testing:**
- Maestro flows for QR scanning cannot be automated (hardware camera) — need manual test plan
- PDF visual regression testing strategy not specified
- Materialized view refresh E2E test approach not detailed

### H4. Actionability Rating

| Spec File | Actionability | Confidence | Notes |
|-----------|:------------:|:----------:|-------|
| README.md | A | 95% | Clear sub-phases, dependencies, deliverables |
| STATUS.md | A | 95% | Complete task tracking, DoD defined |
| database.md | A | 90% | SQL verified against entities, rollback included |
| backend.md | A- | 88% | Good endpoint/DTO detail, some edge cases unspecified |
| reporting.md | A- | 85% | KPIs clear, PDF template needs Handlebars detail |
| analytics.md | A | 90% | Weighted algorithm specified, view SQL verified |
| assets.md | B+ | 83% | Core workflow clear, some category details need verification |
| mobile.md | B+ | 82% | Screen list clear, chart library decision deferred |
| web.md | B+ | 80% | Page list clear, some complex UIs need wireframe detail |
| ios.md | B | 78% | Apple-specific setup needs account-level documentation |
| infrastructure.md | A- | 87% | Staging/prod well-defined, CI/CD scripts actionable |
| testing.md | B+ | 82% | Flow coverage good, hardware-dependent tests flagged |
| user-guide-web.md | A | 92% | Step-by-step, role-based, comprehensive |
| user-guide-mobile.md | A | 90% | Role-organized, installation + troubleshooting |
| maintenance.md | A | 91% | Operational procedures, scripts, troubleshooting |
| evaluation.md | A | 93% | Checklist-based, grading scale, sign-off |
| status_deployment_checklist.md | A | 94% | Sequential checklists, rollback triggers |
| status_reviews.md | A | 95% | Template ready, schedule defined |

**Overall Specification Quality: A- (88%)**

### H5. Recommended Implementation Order

Based on review findings, the recommended implementation sequence:

```
1. database.md migrations (tables + materialized views)     ← Foundation
2. backend.md ReportingModule (Sub-Phase 5-1)               ← Highest value
3. backend.md AnalyticsModule (Sub-Phase 5-2)               ← Parallel with 5-1
4. backend.md AssetsModule (Sub-Phase 5-3)                   ← After 5-1 + 5-2
5. mobile.md + web.md screens for 5-1/5-2/5-3               ← Frontend follows backend
6. ios.md platform setup (Sub-Phase 5-4)                     ← Independent
7. infrastructure.md staging (Sub-Phase 5-5)                 ← After features complete
8. testing.md E2E extension (Sub-Phase 5-8)                  ← After features complete
9. user-guide-web.md + user-guide-mobile.md (Sub-Phase 5-6) ← After UI finalized
10. evaluation.md cross-phase review (Sub-Phase 5-7)         ← Last
```

> **Note:** Address Known Gaps (H3) incrementally during implementation — most gaps are clarified by reading existing code patterns at implementation time.

---

**Last Updated:** 2026-03-14
