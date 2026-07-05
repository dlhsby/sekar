# Phase 2B: UI/UX Revamp - Neo Brutalism 2.0

**Status:** 🟡 In Progress
**Started:** February 2026
**Branch:** `f/ui-ux-revamp`
**Type:** Design System Update (Documentation + Implementation)

---

## Executive Summary

Comprehensive UI/UX revamp applying Neo Brutalism 2.0 design tokens across SEKAR's web dashboard (22 pages) and mobile application (17 screens). This phase focuses on visual consistency, accessibility compliance, and design system modernization.

---

## Objectives

### Primary Goals

1. **Token Consistency** - Unify design tokens between web and mobile platforms
2. **Visual Refinement** - Update from NB 1.0 to NB 2.0 specifications:
   - Border width: 3px → 2px (base)
   - Border radius: 0px/2px → 6px (base)
   - Shadows: Hard-edge → Soft-edge (opacity 0.18-0.22)
   - Sidebar: Navy (#001F3F) → Forest Green (#1A4D2E)
3. **Accessibility Compliance** - WCAG 2.1 AA for all components
4. **Component Parity** - Consistent behavior across web and mobile

### Success Criteria

- [ ] All 16 web components updated to NB 2.0 tokens
- [ ] All 10 mobile components updated to NB 2.0 tokens
- [ ] All 22 web pages pass visual audit
- [ ] All 17 mobile screens pass visual audit
- [ ] Zero accessibility violations (critical/high)
- [ ] Design token documentation complete

---

## Scope

### In Scope

| Area | Items | Documents |
|------|-------|-----------|
| Design Tokens | CSS variables, nbTokens.ts | `components.md` |
| Web Components | 16 NB components | `components.md` |
| Mobile Components | 10 NB components | `components.md` |
| Web Pages | 22 dashboard pages | `web.md` |
| Mobile Screens | 17 app screens | `mobile.md` |
| Accessibility | ARIA, focus, touch targets | All specs |

### Out of Scope

- New feature development
- API changes
- Database modifications
- Navigation restructuring
- New component creation (unless required for parity)

---

## Design Token Changes

### Critical Changes (Breaking)

| Token | Current (v1.0) | Required (v2.0) | Impact |
|-------|----------------|-----------------|--------|
| Sidebar BG | #001F3F (navy) | #1A4D2E (forest) | Visual change |
| Border Width | 3px | 2px | All components |
| Border Radius | 0px/2px | 6px | All components |
| Shadow Type | Hard-edge | Soft-edge | All shadows |

### Web-Specific Changes

| Token | Current (Web) | Required | Impact |
|-------|---------------|----------|--------|
| Primary Color (Web) | #0066CC | #7FBC8C | **CHANGE** - Update globals.css |

### Non-Breaking Changes

| Token | Current | Required | Impact |
|-------|---------|----------|--------|
| Primary Color (Mobile) | #7FBC8C | #7FBC8C | ✅ No change |
| Background | #FDFD96 | #FDFD96 | ✅ No change |
| Touch Targets | 48px | 48px | ✅ No change |

---

## Component Summary

### Web Components (16)

| Component | Token Updates | A11y Updates | Priority |
|-----------|---------------|--------------|----------|
| NBButton | border, radius | ✅ Complete | P1 |
| NBCard | border, radius | ✅ Complete | P1 |
| NBInput | border, radius | ✅ Complete | P1 |
| NBTextarea | border, radius | ✅ Complete | P2 |
| NBSelect | border, radius | ✅ Complete | P1 |
| NBBadge | radius, shadow | ✅ Complete | P2 |
| NBDialog | border, radius | aria-labelledby | P1 |
| NBDropdownMenu | border, radius | ✅ Complete | P2 |
| NBTable | border | aria-sort | P1 |
| NBDataTable | border | aria-sort | P1 |
| NBSidebar | border, colors | aria-expanded | P0 |
| NBEmptyState | border, radius | ✅ Complete | P2 |
| NBSkeleton | radius, shadow | ✅ Complete | P3 |
| NBFormInput | inherits NBInput | ✅ Complete | P1 |
| NBFormSelect | inherits NBSelect | ✅ Complete | P1 |
| NBLabel | - | color explicit | P3 |

### Mobile Components (10)

| Component | Token Updates | A11y Updates | Priority |
|-----------|---------------|--------------|----------|
| NBButton | border, radius, shadow | ✅ Complete | P1 |
| NBCard | border, radius, shadow | ✅ Complete | P1 |
| NBTextInput | border, radius, shadow | ✅ Complete | P1 |
| NBPasswordInput | inherits NBTextInput | ✅ Complete | P1 |
| NBAlert | border, radius, shadow | ✅ Complete | P2 |
| NBBadge | border, radius | Add role/label | P2 |
| NBTab | border, radius | Add tablist role | P2 |
| NBSkeleton | border, radius | Add status role | P3 |
| NBEmptyState | border, radius, shadow | ✅ Complete | P2 |
| NBBackgroundPattern | - | ✅ Complete | P3 |

---

## Page/Screen Summary

### Web Pages (22)

| Priority | Pages | Issues |
|----------|-------|--------|
| P0 | Monitoring, Settings | Critical a11y gaps |
| P1 | Login, Dashboard, Rayons, Report Detail | Major styling gaps |
| P2 | Areas (4), Tasks (2), Reports, Users (3), Schedules (3) | Standard updates |
| P3 | Layouts (2) | Minor updates |

### Mobile Screens (17)

| Priority | Screens | Issues |
|----------|---------|--------|
| P0 | Clock In/Out | Critical worker flow |
| P1 | Login, Register, Worker Home, Supervisor Map, Task Detail, Task Complete | Core flows |
| P2 | Report Submission, Work Reports, Location Tracking, Worker Profile, Supervisor Reports, Supervisor Report Detail, Supervisor Attendance, Tasks Reports, Notifications, Settings | Supporting screens |

---

## Dependencies

### Prerequisites

- Neo Brutalism 2.0 specification finalized (`specs/ui-ux/neo-brutalism.md`)
- Accessibility guidelines reviewed (`specs/ui-ux/accessibility.md`)
- Current component inventory complete

### Downstream Impact

- Phase 3 (Polishing & E2E) - Test updates for visual changes
- Documentation - Screenshots need refresh
- Training materials - UI guidance updates

---

## Related Documents

| Document | Description |
|----------|-------------|
| [STATUS.md](./STATUS.md) | Progress tracking checklists |
| [components.md](./components.md) | Full component specifications |
| [web.md](./web.md) | Web page specifications |
| [mobile.md](./mobile.md) | Mobile screen specifications |
| [timeline.md](./timeline.md) | Implementation schedule |
| [refactor.md](./refactor.md) | Code refactoring tracking |
| [status_reviews.md](./status_reviews.md) | Visual review audit |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Visual regression | High | Medium | Comprehensive visual tests |
| A11y regression | High | Low | Automated a11y testing |
| Mobile-web drift | Medium | Medium | Parity matrix tracking |
| Token conflicts | Low | Low | Central token sources |

---

## Verification Commands

### Web Testing
```bash
cd apps/web
npm test                    # Unit tests (505 tests)
npm run test:e2e            # Playwright E2E tests
npm run lint                # ESLint check
npm run build               # Build verification
```

### Mobile Testing
```bash
cd apps/mobile
npm test                    # Unit tests (2,141 tests)
npm run lint                # ESLint check
npm run android             # Build and run on emulator
```

### Visual Regression
```bash
# Capture baseline screenshots (before changes)
cd apps/web && npx playwright test --update-snapshots

# Compare after changes
cd apps/web && npx playwright test
```

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)
```bash
# Revert all uncommitted changes
git checkout -- .

# Or revert specific files
git checkout -- apps/web/src/app/globals.css
git checkout -- apps/mobile/src/constants/nbTokens.ts
```

### Partial Rollback
```bash
# Revert to last working commit
git log --oneline -5        # Find last working commit
git revert <commit-hash>    # Revert specific commit
```

### Full Phase Rollback
```bash
# Reset to pre-Phase-2A state
git checkout main -- apps/web/src/components/ui/
git checkout main -- apps/mobile/src/components/nb/
git checkout main -- apps/web/src/app/globals.css
git checkout main -- apps/mobile/src/constants/nbTokens.ts
```

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| UX Lead | - | - | Pending |
| Tech Lead | - | - | Pending |
| Product Owner | - | - | Pending |
