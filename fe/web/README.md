# SEKAR Web Dashboard

Next.js web dashboard for supervisors and administrators. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd fe/web
npm install

# Development
npm run dev              # Start dev server (http://localhost:3001)

# Testing
npm test                 # Run unit tests
npm run test:e2e         # Run E2E tests with Playwright
npm run test:e2e:ui      # E2E tests with UI

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript
npm run format           # Prettier
```

## Design Tokens (Phase 3 M1-R Sub-Phase 3-R2)

Tokens are **generated from a single source of truth** to ensure parity across web and mobile.

**Source of Truth:**
- [`specs/ui-ux/tokens.json`](../../specs/ui-ux/tokens.json) — All design values

**Generated:**
- `src/app/generated/tokens.css` — Tailwind v4 CSS variables (DO NOT EDIT)

**Workflow:**
```bash
npm run tokens:build   # From project root, regenerates CSS
npm run tokens:verify  # CI validates no drift
```

**Key Rules:**
- ✅ Edit `tokens.json` → run `npm run tokens:build` → commit
- ❌ Never edit `generated/tokens.css` directly
- ❌ Never use inline hex literals — ESLint blocks them

This ensures identical colors, shadows, and typography across mobile and web.

## Progressive Web App (Phase 3 M1-R Sub-Phase 3-R4)

The web dashboard is now an installable, offline-capable PWA.

**Features:**
- **Installable:** Add-to-home-screen on desktop, tablet, and mobile browsers via install banner
- **Offline Shell:** Minimal HTML + tokens CSS + main JS pre-cached; no offline writes (network-first for mutations)
- **Service Worker:** Pre-caches static assets; runtime SWR 30s for monitoring snapshots
- **Feature Flag:** `NEXT_PUBLIC_FEATURE_PWA` controls SW registration (enabled in staging/prod, disabled in dev)

**Components:**
- `InstallBanner` — Install prompt with 14-day localStorage suppression
- `OfflineBanner` — Status indicator when offline
- `UpdateToast` — New version available notification
- `MobileInstallPush` — Role-gated login banner directing satgas/linmas/korlap to native app

See [`/specs/ui-ux/design-tokens.md`](../../specs/ui-ux/design-tokens.md) for complete design system reference.

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Web Development:** [`CLAUDE.md`](CLAUDE.md)
- **Testing Guide:** [`/specs/testing/web-testing.md`](/specs/testing/web-testing.md)
- **Design Tokens:** [`/specs/ui-ux/design-tokens.md`](/specs/ui-ux/design-tokens.md)
- **Web Specs:** [`/specs/web/`](/specs/web/)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Current Status

- **Version:** Next.js 16.1.6 (App Router)
- **Pages:** 21 pages (+monitoring v2, plants, pruning-requests stubs in Phase 3 M2)
- **Components:** 20+ UI components (Neo Brutalism 2.0 design system)
- **Unit Tests:** 975+ passing, 83.99%+ coverage
- **E2E Tests:** 172+ tests across 8+ spec files
- **Features:** Real-time monitoring (supercluster + virtualized list), map visualization, role-based access, installable PWA, offline-capable shell
- **Phase 3 M1-R:** Token migration ✅, brand fonts loaded, Neo Brutalism hard-edge shadows, responsive 3-column layout (mobile/<768 / tablet/768-1279 / desktop/≥1280)
