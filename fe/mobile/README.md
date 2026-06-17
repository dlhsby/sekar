# SEKAR Mobile App

React Native mobile application for field workers and supervisors. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd fe/mobile
npm install

# Configure backend connection
cp .env.local.example .env.local
# Edit .env.local — set API_BASE_URL to reach the backend (match its PORT):
API_BASE_URL=http://10.0.2.2:3000    # Android emulator
# or
API_BASE_URL=http://<YOUR_IP>:3000   # Physical device (use your machine's LAN IP)
API_VERSION=v1

# Start Metro bundler
npm start

# Run on device
npm run android
npm run ios        # macOS only
```

## Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm run lint                # Lint code
```

## Environment Configuration

Copy `cp .env.local.example .env.local` (gitignored runtime file; loaded by
`react-native-dotenv` via `babel.config.js`). Values:

| Var | Default | Purpose |
|-----|---------|---------|
| **`API_BASE_URL`** | `http://10.0.2.2:3000` | Backend URL — `10.0.2.2:<PORT>` (Android emulator) or `<YOUR_IP>:<PORT>` (device). **Must match the backend's `PORT`.** |
| `API_VERSION` | `v1` | API version prefix |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Maps rendering (optional for non-map flows) |
| `CLUSTER_MARKERS_V2_ENABLED` | `false` | Cluster-based monitoring (M2) |
| `FEATURE_PLANTS_ENABLED` / `FEATURE_PRUNING_REQUESTS_ENABLED` / `FEATURE_PLANT_SEEDS_ENABLED` | `false` | Phase 3 feature flags |

```env
# Minimal local config
API_BASE_URL=http://10.0.2.2:3000    # Android emulator
# API_BASE_URL=http://<YOUR_IP>:3000 # Physical device
API_VERSION=v1
```

Only `.env.local.example` is committed (mobile has no staging/prod env templates).
**Never commit** the real `.env.local`. WSL2 device networking:
[`/specs/deployment/local-development.md`](/specs/deployment/local-development.md).

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Mobile Specs:** [`/specs/mobile/`](/specs/mobile/)
- **Design Tokens:** [`/specs/ui-ux/design-tokens.md`](/specs/ui-ux/design-tokens.md)
- **Neo Brutalism:** [`fe/mobile/CLAUDE.md`](CLAUDE.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Current Status

- **Version:** React Native 0.83.4
- **Screens:** 22 screens (8 worker + 14 supervisor/coordinator/kecamatan)
- **Tests:** 3,836 passing, 80.31%+ coverage
- **Design:** Neo Brutalism 2.0, WCAG 2.1 AA, unified tokens via Phase 3 M1-R
- **Features:** Offline-first, FCM notifications, geofence monitoring, cluster markers (M2), token migration complete
- **Phase 3 M1-R:** Token migration ✅, brand fonts bundled, NB primitive (`NBModal`/`NBToast`/`NBText`) migration complete
