# Web Dashboard (Next.js 16)

**Purpose:** Web dashboard for supervisors & admins — real-time worker monitoring, task assignment, reporting, Google Maps maps, installable PWA.

## Quick Start

For the full one-command setup, see [`/README.md`](/README.md) (`./scripts/setup.sh` + `./scripts/start.sh`). To work on the web alone:

```bash
cd apps/web
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY from https://console.cloud.google.com/google/maps-apis (blank = blank map)

npm run dev              # http://localhost:3001
```

## Environment

Copy `cp .env.local.example .env.local` (plaintext, gitignored). Key vars:

| Var | Default | Purpose |
|-----|---------|---------|
| **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** | _(empty)_ | Google Maps maps (get from https://console.cloud.google.com/google/maps-apis) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Backend base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3000` | WebSocket monitoring stream |
| `WEB_PORT` | `3001` | Dev server port |
| `NEXT_PUBLIC_FEATURE_PWA` | `false` | PWA service worker (enabled staging/prod) |

**Env files use [dotenvx](https://dotenvx.com):** `.env.local` is plaintext + gitignored. `.env.staging` / `.env.production` are committed encrypted; `NEXT_PUBLIC_*` are decrypted at build. `.env.keys` is never committed. See [`/specs/deployment/encrypted-secrets.md`](/specs/deployment/encrypted-secrets.md).

## Testing

```bash
npm test                 # Jest unit tests
npm run test:e2e         # Playwright E2E (headless)
npm run test:e2e:ui      # E2E with UI
```

## Design Tokens & PWA

**Tokens** (generated, source of truth at `/specs/design-system/tokens.json`):
```bash
npm run tokens:build     # From project root
```
Never edit `generated/tokens.css` or use inline hex literals (ESLint blocks them). See [`/CLAUDE.md`](/CLAUDE.md) for Neo Brutalism 2.0 design system + token migration details.

**PWA** (Next.js 16 installable, offline shell): service worker pre-caches HTML shell + tokens CSS + main JS; monitoring snapshots cached 30s. Feature flag `NEXT_PUBLIC_FEATURE_PWA` (on staging/prod). Components: `InstallBanner`, `OfflineBanner`, `UpdateToast`, `MobileInstallPush`. See [`CLAUDE.md`](CLAUDE.md) for full reference.

## Build info & mobile download

The deployed build is shown in the **sidebar footer** (`v… · <sha>`, inlined from the `GIT_SHA` /
`BUILD_TIME` build args). The web also serves the **public mobile-app install pages** `/android` and
`/ios` (plus a download link on the login page + user menu), backed by the backend `app-releases`
registry — these self-update on each mobile release.

## Docs & Specs

- **Root guide (conventions, all services, deploy):** [`/README.md`](/README.md)
- **Full contributor guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Web development & components:** [`CLAUDE.md`](CLAUDE.md)
- **Design tokens & Neo Brutalism:** [`/specs/design-system/design-tokens.md`](/specs/design-system/design-tokens.md)
- **E2E testing guide:** [`/specs/testing/web-testing.md`](/specs/testing/web-testing.md)
- **Web specs:** [`/specs/platforms/web/`](/specs/platforms/web/)
- **Deploy (CI/CD, staging, production):** [`/specs/deployment/deployment-guide.md`](/specs/deployment/deployment-guide.md)
- **All specs:** [`/specs/README.md`](/specs/README.md)
