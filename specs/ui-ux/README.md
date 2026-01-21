# UI/UX Design Specifications

Design system and visual guidelines for SEKAR mobile and web applications.

## Overview

This documentation provides comprehensive design specifications for the UI/UX Designer agent. It complements the screen-level specifications in `specs/mobile/` and `specs/web/` by focusing on the underlying design system, patterns, and accessibility requirements.

## Quick Links

| Document | Description |
|----------|-------------|
| [Design System](./design-system.md) | Foundation overview, design tokens, spacing, elevation |
| [Color Palette](./color-palette.md) | Colors, themes, accessibility contrast ratios |
| [Typography](./typography.md) | Font system, hierarchy, scales |
| [Components](./components.md) | UI component library with states and variants |
| [Icons & Assets](./icons-assets.md) | Icon system, image guidelines, asset standards |
| [Interaction Patterns](./interaction-patterns.md) | Animations, gestures, feedback patterns |
| [Accessibility](./accessibility.md) | WCAG 2.1 AA compliance checklist |
| [Responsive Design](./responsive-design.md) | Breakpoints, layout patterns |

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

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active - Phase 1
**Implementation:** `fe/mobile/src/constants/theme.ts`
