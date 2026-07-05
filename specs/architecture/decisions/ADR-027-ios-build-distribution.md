# ADR-027: iOS Build & Distribution Strategy

**Date:** March 13, 2026
**Status:** Accepted
**Deciders:** Technical Lead, Mobile Developer
**Related:** Phase 4 Sub-Phase 4-4 (iOS Platform)

---

## Context

Phase 4 introduces iOS platform support for the SEKAR React Native app. We need to decide on the build, signing, and distribution strategy for development, testing, and production. The app must be distributed to DLH Surabaya employees via the App Store.

## Decision Drivers

- **Distribution reach** — DLH employees use a mix of iPhones (personal devices)
- **Update frequency** — App updates should reach users quickly
- **Testing workflow** — QA team needs access to pre-release builds
- **CI/CD integration** — Automated builds on merge to main
- **Cost** — Apple Developer Program ($99/year) is a fixed cost

## Decision

### Distribution Channel: App Store (Public)

The app will be distributed via the public App Store (not Apple Business Manager / Enterprise) because:

1. DLH employees use **personal devices** — no MDM enrollment
2. App Store handles updates automatically
3. No risk of enterprise certificate revocation
4. Free for end users

### Testing: TestFlight

- **Internal testing** — Up to 100 Apple IDs (development team)
- **External testing** — Up to 10,000 testers (DLH staff beta group)
- **Beta review** — Required for external testers, usually <24 hours

### Build Signing

| Environment | Signing | Provisioning Profile |
|-------------|---------|---------------------|
| Development | Development certificate | Wildcard development profile |
| TestFlight | Distribution certificate | App Store distribution profile |
| App Store | Distribution certificate | App Store distribution profile |

### CI/CD Pipeline

GitHub Actions with `macos-latest` runner:

```yaml
# Trigger: push to main (paths: apps/mobile/**)
# Steps: npm ci → pod install → xcodebuild archive → export IPA → upload TestFlight
```

Manual approval gate before App Store release.

### Apple Sign-In Requirement

Since the app offers identifier-based login (username/phone), Apple requires Apple Sign-In as an alternative option on iOS. This is implemented via `@invertase/react-native-apple-authentication`.

## Alternatives Considered

### Enterprise Distribution (Rejected)

- Requires Apple Developer Enterprise Program ($299/year)
- Meant for internal-only apps on company devices
- Risk: Apple has revoked enterprise certificates for misuse
- DLH employees use personal devices → doesn't fit

### Ad Hoc Distribution (Rejected for Production)

- Limited to 100 registered device UDIDs
- DLH has 200+ potential users
- Used only for development testing

### PWA (Rejected)

- iOS Safari PWA lacks: push notifications, background location, camera access
- These are all critical SEKAR features

## Consequences

- **Positive:** Wide reach, automatic updates, Apple handles hosting/CDN
- **Negative:** App Store review process (1-3 days), Apple's 30% cut (N/A, app is free)
- **Mitigation:** TestFlight for rapid iteration; submit early to account for review time

---

**Last Updated:** 2026-03-13
