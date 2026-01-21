# ADR-007: React Native over Flutter

**Date:** 2026-01-09
**Status:** ✅ Accepted
**Deciders:** CTO, Tech Lead, Mobile Team
**Tags:** mobile, framework, technology-choice

---

## Context

Need to build cross-platform mobile app (Android initially, iOS in Phase 5). Must support offline-first, GPS, camera, maps, and background location tracking.

---

## Decision

**Use React Native 0.76+ with TypeScript for mobile development.**

---

## Consequences

### ✅ Positive

**Team Expertise:**
- Team already knows JavaScript/TypeScript
- Shared types with NestJS backend
- Faster onboarding for web developers

**Ecosystem:**
- Mature library ecosystem (2015+)
- Excellent offline support (Redux, AsyncStorage)
- Great mapping libraries (react-native-maps)
- Native module availability

**Development Speed:**
- Hot reload for rapid iteration
- Chrome DevTools debugging
- Can reuse web components (Phase 6)

**Community:**
- Large community, easy to find solutions
- Used by Facebook, Instagram, Airbnb
- Lots of tutorials and examples

### ❌ Negative

**Performance:**
- Bridge overhead for native communication
- Slightly slower than native or Flutter
- Mitigation: 60fps achievable with optimization

**iOS Support:**
- Different native modules needed
- Platform-specific bugs
- Mitigation: Deferred to Phase 5

**Build Size:**
- Larger app size (~30MB Android, ~50MB iOS)
- Mitigation: Acceptable for government app

---

## Alternatives Considered

### 1. Flutter
**Pros:** Better performance, single codebase
**Cons:** Team doesn't know Dart, smaller ecosystem, backend is TypeScript (context switching)

### 2. Native (Kotlin/Swift)
**Pros:** Best performance
**Cons:** Must maintain 2 codebases, slower development, higher cost

### 3. Ionic/Capacitor
**Pros:** Web-based, easy for web team
**Cons:** Poor offline support, slower, limited native access

---

## Validation

### Phase 1 Results
- ✅ 60fps UI performance
- ✅ Background location tracking works
- ✅ GPS accuracy sufficient
- ✅ Offline sync working reliably
- ✅ Camera integration smooth
- ✅ Build time: 3 min (acceptable)

---

**Related ADRs:** [ADR-002: Offline-First](./ADR-002-offline-first-mobile.md)

**Last Updated:** 2026-01-16
