# SEKAR Mobile App

React Native mobile application for field workers and supervisors. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd fe/mobile
npm install

# Configure backend connection
# Edit .env file:
API_BASE_URL=http://10.0.2.2:3000    # Android emulator
# or
API_BASE_URL=http://<YOUR_IP>:3000   # Physical device
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

## Environment Configuration (Phase 3)

Edit `.env` file for Phase 3 features:

```env
# Backend API
API_BASE_URL=http://10.0.2.2:3000    # Android emulator
# or
API_BASE_URL=http://<YOUR_IP>:3000   # Physical device
API_VERSION=v1

# Phase 3 Feature Flags
NEXT_PUBLIC_FEATURE_CLUSTER_MARKERS_V2=true    # Cluster-based monitoring (M2)
NEXT_PUBLIC_FEATURE_PWA=true                   # PWA installation (web only)
```

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
