# Phase 4 Deployment Record — Production Readiness, Rebrand & UI/UX Revamp

> **Per-phase deployment record.** Generic deploy/operate procedures live in the consolidated [`deployment-guide.md`](deployment-guide.md) (+ [`operations.md`](operations.md), [`credentials-setup.md`](credentials-setup.md)). This file records only what **Phase 4 actually shipped** and where its canonical deploy detail lives.
>
> **History note:** an earlier draft of this file described an "Asset Management / QR codes" Phase 4. That roadmap was rescoped — asset management actually shipped in **Phase 5** ([`phase-5-deployment.md`](phase-5-deployment.md)). The real Phase 4 is **Production Readiness**.

## What Phase 4 shipped

Production-readiness hardening, brand refresh, and a UI/UX revamp (Design System v2.1) over the existing system — **no new product vertical**. Highlights (see `specs/phases/phase-4-production-readiness/STATUS.md` for the full trail):

- **Production readiness (4-V / ADR-043):** production seeder + retention/summary/purge crons + index closure + paginated endpoints; default-deny web route protection (migrated to `src/proxy.ts` for Next 16); ProGuard, `sekar://` deep links, platform permissions; Notifee-hosted Android foreground service for screen-off shift tracking.
- **Rebrand + Design System v2.1 (4-R / ADR-040):** token-driven restyle across mobile + web; WCAG-AA contrast pass (`e2e/14-a11y.spec.ts`, 15 pages).
- **WebSocket scaling audit (4-1 / ADR-016):** Redis adapter validation.
- **Reassignment audit trail (4-4):** history endpoint + web bulk-reassign modal + mobile Riwayat Pemindahan + account-mutation audit logging.
- **Export hardening (4-5):** CSV formula-injection fix, date inclusivity.
- **Perf passes (4-7):** >800-line file splits, Asia/Jakarta day-boundary fixes, lazy mapbox-gl, list memoization.
- **E2E (4-9 / ADR-017):** 15 Maestro flows + security/monitoring Playwright + CI workflows.

**Deploy-relevant deltas vs. Phase 3:** new env vars (`SUPPORT_HOTLINE_*`, retention/cron knobs), the production seeder + retention/purge crons, and the new dev scripts (`scripts/setup.sh`/`start.sh`/`stop.sh`) with per-project port overrides. No new external service. All captured in [`environment-variables.md`](environment-variables.md) and the deploy/operate flow in [`deployment-guide.md`](deployment-guide.md).

## Canonical Phase 4 deploy docs

| Document | Purpose |
|----------|---------|
| [`../phases/phase-4-production-readiness/deployment-runbook.md`](../phases/phase-4-production-readiness/deployment-runbook.md) | Step-by-step Phase 4 deployment runbook |
| [`../phases/phase-4-production-readiness/status_deployment_checklist.md`](../phases/phase-4-production-readiness/status_deployment_checklist.md) | Phase 4 deployment checklist |
| [`../phases/phase-4-production-readiness/infrastructure.md`](../phases/phase-4-production-readiness/infrastructure.md) | Redis / Docker / Sentry / CI-CD infra for Phase 4 |
| [`../phases/phase-4-production-readiness/STATUS.md`](../phases/phase-4-production-readiness/STATUS.md) | Implementation status (source of truth for the phase) |

## See also

- Consolidated deployment: [`deployment-guide.md`](deployment-guide.md)
- Operations / rollback / incidents: [`operations.md`](operations.md)
- Prior phase record: [`phase-3-deployment.md`](phase-3-deployment.md) · Next: [`phase-5-deployment.md`](phase-5-deployment.md)
