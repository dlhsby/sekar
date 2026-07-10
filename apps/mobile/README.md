# Mobile App (React Native 0.83)

**Purpose:** Field worker + supervisor mobile app — GPS clock-in/out, photo verification, offline work reports, task assignment, geofence monitoring, FCM notifications.

## Quick Start

For the full one-command setup, see [`/README.md`](/README.md) (`./scripts/setup.sh` + `./scripts/start.sh`). To work on the mobile app alone:

```bash
cd apps/mobile
npm install
cp .env.local.example .env.local
# Edit .env.local — set API_BASE_URL:
#   Android emulator: API_BASE_URL=http://10.0.2.2:3000
#   Physical device: API_BASE_URL=http://<YOUR_LAN_IP>:3000 (match backend PORT)

npm start                # Metro bundler
npm run android          # Run on Android (emulator or device)
npm run ios              # Run on iOS (macOS only)
```

## Environment

Copy `cp .env.local.example .env.local` (plaintext, gitignored; loaded by `babel.config.js` `ENVFILE`). Key vars:

| Var | Default | Purpose |
|-----|---------|---------|
| **`API_BASE_URL`** | `http://10.0.2.2:3000` | Backend URL (Android emulator: `10.0.2.2:<PORT>`; device: `<YOUR_IP>:<PORT>`) |
| `API_VERSION` | `v1` | API version |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Maps rendering (optional) |
| `CLUSTER_MARKERS_V2_ENABLED` | `false` | Cluster-based monitoring feature (M2) |
| `FEATURE_PLANTS_ENABLED`, etc. | `false` | Phase 3 feature flags |

**Env files use [dotenvx](https://dotenvx.com):** `.env.local` is plaintext + gitignored. `.env.staging` / `.env.production` are committed encrypted; release builds decrypt them via `scripts/decrypt-env.js`. `.env.keys` is never committed. See [`/specs/deployment/encrypted-secrets.md`](/specs/deployment/encrypted-secrets.md).

## Testing

```bash
npm test                 # Jest unit tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage
npm run lint             # Lint code
```

## Release & Version Checking

**Cut a release** (recommended — bump + tag + build):
```bash
scripts/release.sh mobile 0.1.0 2    # bumps version + versionCode(2), tags mobile-v0.1.0, pushes
```
The `mobile-v*` tag triggers `mobile-release.yml`: signed **APK + AAB**, **auto-published** to the
download registry so the web links (`sekar.wahyutrip.com/android`) + in-app checker update themselves.
Manual fallback: `gh workflow run "Mobile Release (Android · staging)" --ref main -f environment=staging`
then `gh run download <run-id>`.

**Local build scripts:**
```bash
npm run build:release:staging     # Hand-cut release (signed APK+AAB, with clean)
npm run build:android:staging     # Staging APK
npm run build:aab:production      # Production AAB
```

**In-app version checker:** `useAppUpdate` hook reads `versionCode` (from `react-native-device-info`) and compares to `GET /app-releases/latest`. Shows update banner on field home + Diagnostics (Profil → Diagnostik & Izin). **Bump `android/app/build.gradle versionCode` per release** — checker compares it. Dev/staging → APK download; production → Play Store (not yet wired).

Full runbook: [`/specs/deployment/android-release-guide.md`](/specs/deployment/android-release-guide.md).

## Design & Docs

**Design tokens** (generated, source of truth at `/specs/design-system/tokens.json`):
```bash
npm run tokens:build     # From project root
```
Never edit `generated/tokens.ts` or use inline hex literals (ESLint blocks them). Neo Brutalism 2.0 primitives: `NBButton`, `NBCard`, `NBTextInput`, `NBModal`, `NBToast`, `NBText`. See [`CLAUDE.md`](CLAUDE.md) for full reference + token migration details.

- **Root guide (conventions, all services, deploy):** [`/README.md`](/README.md)
- **Full contributor guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Mobile development & components:** [`CLAUDE.md`](CLAUDE.md)
- **Design tokens & Neo Brutalism:** [`/specs/design-system/design-tokens.md`](/specs/design-system/design-tokens.md)
- **Component library reference:** [`/specs/platforms/mobile/component-library.md`](/specs/platforms/mobile/component-library.md)
- **Mobile specs:** [`/specs/platforms/mobile/`](/specs/platforms/mobile/)
- **Deploy (CI/CD, releases, Play Store):** [`/specs/deployment/deployment-guide.md`](/specs/deployment/deployment-guide.md)
- **All specs:** [`/specs/README.md`](/specs/README.md)
