# ADR-005: 100m GPS Boundary Tolerance

**Date:** 2026-01-16
**Status:** ✅ Accepted
**Deciders:** System Architect, Product Owner, Field Testing Team
**Tags:** gps, validation, business-rules

---

## Context

Workers must clock in/out within their assigned area boundary. GPS accuracy varies based on environment (trees, buildings, weather). Need balance between security (prevent fraud) and usability (don't reject valid clock-ins).

### Field Testing Results (5 areas, 10 workers, 2 weeks)

| Tolerance | False Rejections | Fraud Risk | User Satisfaction |
|-----------|------------------|------------|-------------------|
| 50m | 18% | Low | Poor (complaints) |
| 100m | 2% | Low | Good |
| 150m | 0.5% | Medium | Excellent |

---

## Decision

**Standardize GPS boundary tolerance to 100 meters across all specifications and implementations.**

### Validation Logic

```typescript
// Haversine distance calculation
const distance = calculateDistance(
  userGPS.lat, userGPS.lng,
  area.gps_lat, area.gps_lng
);

const BOUNDARY_TOLERANCE = 100; // meters (from business-rules.md)

if (distance <= area.radius_meters + BOUNDARY_TOLERANCE) {
  // Within bounds, allow clock-in
} else {
  // Out of bounds, reject with helpful message
  throw new Error(`Anda berada ${Math.round(distance - area.radius_meters)}m dari area. Harap mendekati lokasi.`);
}
```

---

## Consequences

### ✅ Positive
- **Usability:** Only 2% false rejections (vs 18% at 50m)
- **Security:** Still prevents workers from clocking in far away
- **GPS Reality:** Accounts for typical GPS drift (±10-20m)
- **User Trust:** Workers don't feel system is unfairly blocking them

### ❌ Negative
- **Fraud Window:** Worker could clock in 100m outside area
- **Edge Cases:** Near boundaries of multiple areas (mitigated by area assignment)

### Risk Mitigation
- Phase 2: Supervisor manual override for edge cases
- Phase 3: GPS spoofing detection (velocity checks, pattern analysis)
- Phase 3: 80m warning (alert before rejection at 100m)

---

## Alternatives Considered

1. **50m tolerance** - Too strict, 18% false rejection rate
2. **150m tolerance** - Too loose, security concern from supervisors
3. **Dynamic tolerance** (based on GPS accuracy) - Complex, deferred to Phase 3

---

## Implementation

- [x] Update business-rules.md with 100m standard
- [x] Update all specs referencing GPS tolerance
- [x] Backend: `gps.util.ts` uses 100m constant
- [x] Mobile: `gpsUtils.ts` uses 100m constant
- [x] Phase 1 README, timeline, backend.md, STATUS.md updated

**Single Source of Truth:** `/specs/business-rules.md` line 11

---

**Related ADRs:** [ADR-001: UUID PKs](./ADR-001-uuid-primary-keys.md)

**Last Updated:** 2026-01-16
