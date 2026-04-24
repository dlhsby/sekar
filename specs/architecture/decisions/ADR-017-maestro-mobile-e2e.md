# ADR-017: Maestro for Mobile E2E Testing

## Status

Accepted

## Date

2026-03-12

## Context

SEKAR needs mobile E2E testing for production readiness (Phase 3). The original Phase 3 plan (January 2026) specified Detox by Wix. We need to evaluate whether Detox is still the best choice for React Native 0.83.1.

### Evaluation Criteria

1. **React Native 0.83.1 compatibility** — Must work with latest RN + Hermes
2. **CI cost** — GitHub Actions runner minutes are a constraint
3. **Test stability** — Flaky E2E tests provide negative value
4. **Learning curve** — Single developer team; minimal ramp-up time preferred
5. **Android-first** — iOS is Phase 4; Android is the production platform

## Decision

**Use Maestro by mobile.dev** for mobile E2E testing instead of Detox.

### Comparison

| Criterion | Detox | Maestro |
|-----------|-------|---------|
| RN 0.83 support | Requires patches for new arch | Version-agnostic (UI-level) |
| Test format | JavaScript/TypeScript | YAML (declarative) |
| CI runner | macOS (expensive) | Ubuntu + KVM (cheap) |
| Build requirement | Debug APK + test APK | Release APK only |
| Avg CI time | ~15 min (macOS + emulator + build) | ~8 min (Ubuntu + KVM + install) |
| Flakiness | Medium (gray-box timing issues) | Low (built-in smart waits) |
| Learning curve | High (JS + RN bridge + native config) | Low (YAML declarations) |
| iOS support | Full | Full (but not needed yet) |
| Offline testing | Manual mock | `toggleAirplane` command built-in |
| Deep link testing | Extra setup | `openLink` command built-in |

### Key Advantages for SEKAR

1. **YAML flows** — 15+ test flows can be written in ~2 hours vs ~2 days for Detox
2. **Ubuntu CI** — Saves ~60% on CI costs vs macOS runners
3. **`toggleAirplane`** — Critical for testing offline sync (Requirement #1)
4. **`openLink`** — Critical for testing deep linking (mobile production readiness)
5. **No build dependency** — Works with release APK, enabling ProGuard testing

## Consequences

### Positive

- Faster test authoring (YAML vs TypeScript)
- Cheaper CI (Ubuntu vs macOS runners)
- Lower flakiness (declarative waits vs manual timing)
- Built-in airplane mode and deep link support
- Works with production (ProGuard-enabled) builds

### Negative

- UI-level only (cannot assert internal state like Redux)
- Less precise than gray-box testing (cannot access RN bridge)
- Relatively newer tool (less community content than Detox)
- Cannot test native module internals (camera, GPS sensor)

### Mitigations

- Internal state assertions handled by existing 3,669+ unit tests
- GPS mocking done via `adb emu geo fix` in CI
- Camera mocking not needed (selfie is optional in Phase 2E)
- Strong community growth; backed by mobile.dev with regular releases

## Alternatives Considered

1. **Detox** — Original plan; rejected due to RN 0.83 compatibility issues, macOS CI cost, and higher learning curve
2. **Appium** — Too slow for CI; better suited for cross-platform QA teams
3. **No mobile E2E** — Unacceptable for production readiness
