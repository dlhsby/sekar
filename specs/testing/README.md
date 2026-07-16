# Testing

Coverage gate **>80%** per workspace. Pyramid: unit → integration → E2E (Playwright web, Maestro mobile).

| Doc | What |
|-----|------|
| [`strategy.md`](strategy.md) | Coverage targets, pyramid, per-role test matrix |
| [`backend-testing.md`](backend-testing.md) | NestJS + Jest, fixtures (528+ tests) |
| [`web-testing.md`](web-testing.md) | Playwright E2E + a11y (1,700+ tests) |
| [`mobile-testing.md`](mobile-testing.md) | Maestro E2E + Jest, WCAG-AA audit (4,200+ tests) |
| [`test-data.md`](test-data.md) | Personas, seed scenarios, edge cases |
| [`presence-model-matrix.md`](presence-model-matrix.md) | Presence & attendance model ([ADR-050](../architecture/decisions/ADR-050-presence-attendance-model.md)) — Phase 5.4 TDD target, ~55 cases in 6 layers |
| [`error-codes.md`](error-codes.md) | Error-code reference + integration checklist (mirrors `ApiErrorCode`) |

Commands: `npm test` (each workspace) · `npm run test:cov` (backend) · `npm run test:e2e` (web).
