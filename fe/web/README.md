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

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Testing Guide:** [`/specs/testing/web-testing.md`](/specs/testing/web-testing.md) - Complete testing guide (unit + E2E)
- **Web Specs:** [`/specs/web/`](/specs/web/)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Current Status

- **Version:** Next.js 16.1.4 (App Router)
- **Pages:** 18 pages
- **Components:** 16 UI components (Neo Brutalism design)
- **Unit Tests:** 975 passing (83.99% coverage) ✅
- **E2E Tests:** 172 tests across 8 spec files ✅
- **Features:** Real-time monitoring, map visualization, CRUD operations, role-based access
