# UI/UX Design Specifications

Design system and visual guidelines for SEKAR mobile and web applications.

## Overview

This documentation provides comprehensive design specifications for the UI/UX Designer agent. It complements the screen-level specifications in `specs/mobile/` and `specs/web/` by focusing on the underlying design system, patterns, and accessibility requirements.

## Quick Links

| Document | Description |
|----------|-------------|
| **[REVIEW SUMMARY](./REVIEW_SUMMARY.md)** | **Complete UI/UX specs review (Jan 2026)** |
| [Design System](./design-system.md) | Foundation overview, design tokens, spacing, elevation |
| [Color Palette](./color-palette.md) | Colors, themes, accessibility contrast ratios |
| [Typography](./typography.md) | Font system, hierarchy, scales, Indonesian patterns |
| [Components](./components.md) | UI component library with states and variants (Phase 1) |
| [Future Phases Patterns](./future-phases-patterns.md) | Phase 2-6 UI specifications (30 components) |
| [Icons & Assets](./icons-assets.md) | Icon system, image guidelines, asset standards |
| [Interaction Patterns](./interaction-patterns.md) | Animations, gestures, feedback patterns |
| [Accessibility](./accessibility.md) | WCAG 2.1 AA compliance + outdoor usability |
| [Responsive Design](./responsive-design.md) | Breakpoints, layout patterns, web dashboard |

---

## Design Principles

### 1. Clarity
- Clear visual hierarchy
- Scannable content
- Consistent iconography
- Meaningful color usage

### 2. Efficiency
- Minimal taps for common tasks
- Quick access to primary actions
- Streamlined workflows
- Progressive disclosure

### 3. Offline-First
- Visual feedback for sync status
- Clear indication of pending actions
- Graceful degradation
- Local data persistence feedback

### 4. Accessibility
- WCAG 2.1 AA compliant
- Minimum 4.5:1 contrast ratios
- 48×48px minimum touch targets
- Screen reader compatible

### 5. Consistency
- Same patterns across platforms
- Unified color language
- Consistent typography scale
- Predictable interactions

---

## Target Users

### Field Workers (Petugas Lapangan)
- **Context:** Outdoor work in parks, sidewalks, gardens
- **Challenges:** Bright sunlight, may wear gloves, varying literacy levels
- **Needs:** Large touch targets, high contrast, simple vocabulary, quick actions

### Supervisors (Pengawas)
- **Context:** Office and field, monitoring multiple workers
- **Challenges:** Quick decision-making, data overview
- **Needs:** Dashboard clarity, quick filtering, map visualization

### Administrators (Admin)
- **Context:** Office-based, system configuration
- **Challenges:** Complex data management
- **Needs:** Comprehensive tables, bulk actions, detailed reports

---

## Implementation Reference

The design system is implemented in:
- **Mobile:** `fe/mobile/src/constants/theme.ts`
- **Components:** `fe/mobile/src/components/`

All specifications in this folder align with the existing implementation.

---

## Related Documentation

| Spec Folder | Purpose |
|-------------|---------|
| `specs/mobile/screens.md` | Screen wireframes and layouts |
| `specs/mobile/navigation.md` | Navigation structure |
| `specs/web/pages.md` | Web dashboard pages |
| `specs/architecture/data-flow.md` | Data flow patterns |

---

## Phase Status

| Phase | Components | Status |
|-------|-----------|--------|
| **Phase 1 MVP** | 14 core components | ✅ Specified & Implemented (UI/UX Enhanced Jan 23) |
| **Phase 2** | 3 components (Task, Badge, Notification) | ✅ Specified (pending implementation) |
| **Phase 3** | 5 components (Charts, Dashboard, Builder) | ✅ Specified (pending implementation) |
| **Phase 4** | 3 components (QR, Asset, Maintenance) | ✅ Specified (pending implementation) |
| **Phase 5** | 4 patterns (iOS-specific) | ✅ Specified (pending implementation) |
| **Phase 6** | 4 components (Web dashboard) | ✅ Specified (pending implementation) |

See [Future Phases Patterns](./future-phases-patterns.md) for Phases 2-6 implementation details.

---

## Phase 1 MVP UI/UX Enhancements (January 23, 2026)

### New Components
| Component | Description |
|-----------|-------------|
| **SkeletonLoader** | Shimmer animation for loading states with proper memory cleanup |
| **EmptyState** | 9 contextual variants (reports, shifts, workers, locations, notifications, search, error, offline, generic) |

### Enhanced Components
| Component | Enhancement |
|-----------|-------------|
| **Button** | Haptic feedback, focus indicators, isCritical prop (72dp) |
| **Card** | 3 variants (elevated, outlined, filled), delayLongPress, hitSlop |
| **TextInput** | Success state with green border + checkmark icon, consistent 2px border |

### Performance Optimizations
| Feature | Description |
|---------|-------------|
| **Map clustering** | O(n log n) algorithm with spatial indexing and binary search |
| **Progressive loading** | 50 workers initially, 500 loaded in background |
| **Region validation** | Prevents NaN/undefined crashes during map initialization |
| **Animation cleanup** | SkeletonLoader properly stops animations on unmount |
| **Timer refs** | useRef pattern prevents stale closures in intervals |

### Accessibility Improvements
| Feature | Details |
|---------|---------|
| **Warning color** | Changed #FF9800 → #F57C00 for 4.5:1 outdoor contrast |
| **Consistent borders** | 2px borders prevent layout shift on focus/error/success |
| **Focus indicators** | Visible focus ring for keyboard/screen reader navigation |
| **Live regions** | GPS status announces changes to screen readers |

### File Changes
| File | Changes |
|------|---------|
| `src/components/common/SkeletonLoader.tsx` | NEW - Shimmer loading component |
| `src/components/common/EmptyState.tsx` | NEW - 9 contextual empty state variants |
| `src/utils/mapUtils.ts` | NEW - Clustering algorithm + region validation |
| `src/components/common/Button.tsx` | Haptic feedback, focus indicators |
| `src/components/common/Card.tsx` | Variants, press feedback |
| `src/components/common/TextInput.tsx` | Success state, consistent borders |
| `src/constants/theme.ts` | Warning color fix |
| `src/screens/supervisor/MapDashboardScreen.tsx` | Clustering, progressive loading |

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-23
**Status:** Active - Complete through Phase 6 specifications
**Implementation:** `fe/mobile/src/constants/theme.ts`
