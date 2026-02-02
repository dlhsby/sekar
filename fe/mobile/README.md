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

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Mobile Specs:** [`/specs/mobile/`](/specs/mobile/)
- **Phase 2 Mobile:** [`/specs/phases/phase-2-enhanced/mobile.md`](/specs/phases/phase-2-enhanced/mobile.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Current Status

- **Version:** React Native 0.76.x
- **Screens:** 17 screens (8 worker + 9 supervisor/coordinator)
- **Tests:** 2,141 passing (99.07% pass rate)
- **Coverage:** 80.31% statements, 80.53% lines
- **Design:** Neo Brutalism UI, WCAG 2.1 AA compliant
- **Features:** Offline-first, FCM notifications, background location tracking
