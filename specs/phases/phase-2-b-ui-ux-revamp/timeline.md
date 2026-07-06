# Phase 2B: UI/UX Revamp - Implementation Timeline

**Last Updated:** February 5, 2026
**Total Duration:** 3-4 weeks
**Branch:** `f/ui-ux-revamp`

---

## Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Token Updates + Core Components | Updated design tokens, 10 critical components |
| 2 | Remaining Components + P0/P1 Pages | All components updated, critical pages fixed |
| 3 | P2/P3 Pages + Mobile Screens | All pages updated, mobile screens updated |
| 4 | Verification + Documentation | Full audit, documentation updates |

---

## Week 1: Foundation

### Day 1-2: Token Updates

**Web Tokens (globals.css)**
- [ ] Update `--nb-primary` color reference
- [ ] Add sidebar color palette (`--nb-sidebar`, `--nb-sidebar-hover`, `--nb-sidebar-active`)
- [ ] Update all shadow definitions to soft-edge
- [ ] Update border radius Tailwind extensions
- [ ] Verify Tailwind config integration

**Mobile Tokens (nbTokens.ts)**
- [ ] Update `nbBorders` object (thin: 1, base: 2, thick: 3, extra: 4)
- [ ] Update `nbBorderRadius` object (sm: 4, base: 6, md: 8, lg: 12)
- [ ] Update `nbShadows` object (soft-edge with opacity 0.18-0.22)
- [ ] Add any missing color tokens
- [ ] Run mobile tests to verify no regressions

**Verification**
- [ ] Visual spot check on 3 sample pages/screens
- [ ] No TypeScript/ESLint errors
- [ ] Existing tests still pass

### Day 3-4: Critical Web Components (P1)

**Morning: Form Components**
- [ ] NBButton - border-2, rounded-nb-base
- [ ] NBInput - border-2, rounded-nb-base
- [ ] NBSelect - trigger/content updates
- [ ] NBFormInput - inherits NBInput
- [ ] NBFormSelect - inherits NBSelect

**Afternoon: Container Components**
- [ ] NBCard - border-2, rounded-nb-base, subcomponents
- [ ] NBDialog - border-2, rounded-nb-md, aria-labelledby
- [ ] NBTable - border-2, header border, aria-sort

### Day 5: Critical Mobile Components (P1)

**Morning**
- [ ] NBButton - token refs update
- [ ] NBCard - token refs update
- [ ] NBTextInput - token refs, focus shadow

**Afternoon**
- [ ] NBPasswordInput - inherits NBTextInput
- [ ] Run full mobile test suite
- [ ] Visual verification on emulator

---

## Week 2: Components + Critical Pages

### Day 6-7: Remaining Web Components

**P2 Components**
- [ ] NBTextarea
- [ ] NBBadge - add shadow-xs, rounded-nb-sm
- [ ] NBDropdownMenu
- [ ] NBEmptyState
- [ ] NBDataTable (inherits NBTable)

**P3 Components**
- [ ] NBSkeleton - add shadow-xs, rounded-nb-sm
- [ ] NBLabel - explicit color

**Critical: NBSidebar**
- [ ] Update background: #001F3F → #1A4D2E
- [ ] Update hover: #2D5233
- [ ] Update active: #0F3520
- [ ] Update border-r-3 → border-r-2
- [ ] Add aria-expanded to collapsible items
- [ ] Test navigation functionality

### Day 8-9: Remaining Mobile Components

**P2 Components**
- [ ] NBAlert - token refs, shadow
- [ ] NBBadge - token refs, add accessibility
- [ ] NBTab - token refs, add tablist role to container
- [ ] NBEmptyState - token refs

**P3 Components**
- [ ] NBSkeleton - token refs, add accessibility
- [ ] NBBackgroundPattern - verify no changes

**Run Tests**
- [ ] Full mobile test suite
- [ ] Coverage verification (maintain 80%+)

### Day 10: P0 Pages/Screens

**Web P0 Pages**
- [ ] Monitoring page
  - Add aria-label to all status dots
  - Add aria-live region for updates
  - Fix legend accessibility
- [ ] Settings page
  - Add role="switch" to all toggles
  - Add aria-checked state
  - Fix hardcoded dimensions

**Mobile P0 Screen**
- [ ] Clock In/Out
  - Apply all token updates
  - Verify camera container styling
  - Verify location card states
  - Verify button states

---

## Week 3: Pages/Screens Complete

### Day 11-12: Web P1 Pages

**Authentication**
- [ ] Login page - NB card styling, focus ring, error aria-live

**Core Dashboard**
- [ ] Dashboard Home - stat card styling, aria-labels
- [ ] Rayons List - fix gray→nb-gray colors, loading a11y
- [ ] Report Detail - add photo alt text, GPS aria-label

### Day 13-14: Web P2 Pages

**Areas (4 pages)**
- [ ] Areas List - responsive widths, gap standardization
- [ ] Area Detail - responsive height, map aria-label
- [ ] Area Edit - token updates
- [ ] Area New - token updates

**Tasks (2 pages)**
- [ ] Tasks List - filter ARIA, stat card aria-label
- [ ] Task New - fix color tokens, remove hardcoded padding

**Reports**
- [ ] Reports List - date filter aria-label, search aria-live

### Day 15: Web P2/P3 Pages (continued)

**Users (3 pages)**
- [ ] Users List - table aria-sort, pagination aria-live
- [ ] User New - form error aria-live
- [ ] User Edit - loading aria-label

**Schedules (3 pages)**
- [ ] Schedules List - dialog aria-labelledby
- [ ] Schedule New - fix color tokens
- [ ] Schedule Edit - same as new

**Rayons Detail**
- [ ] Rayon Detail - breadcrumb aria-label, spacing tokens

**Layouts**
- [ ] Dashboard Layout - sidebar toggle aria-expanded
- [ ] Root Layout - verify lang="id"

### Day 16-17: Mobile Screens

**Auth Stack (2)**
- [ ] Login - all token updates
- [ ] Register - all token updates

**Worker Stack (6)**
- [ ] Worker Home - card/button/badge updates
- [ ] Report Submission - form token updates
- [ ] Work Reports - list/badge updates
- [ ] Location Tracking - map/card updates
- [ ] Worker Profile - card/badge updates

**Supervisor Stack (4)**
- [ ] Supervisor Map - marker/card updates
- [ ] Supervisor Reports - tab/card/badge updates
- [ ] Supervisor Report Detail - card/button/badge updates
- [ ] Supervisor Attendance - date picker/card updates

**Task Screens (3)**
- [ ] Task Detail - badge/card/button updates
- [ ] Task Complete - form/alert updates
- [ ] Tasks Reports - tab/card updates

**Common (2)**
- [ ] Notifications - card updates
- [ ] Settings - toggle/card updates

---

## Week 4: Verification + Documentation

### Day 18-19: Full Audit

**Design Token Compliance**
- [ ] Audit: Primary color #7FBC8C everywhere
- [ ] Audit: Background #FDFD96 on main backgrounds
- [ ] Audit: Sidebar #1A4D2E (not #001F3F)
- [ ] Audit: Black #1C1917 (not #000000)
- [ ] Audit: All borders 2px base
- [ ] Audit: All radius 6px base
- [ ] Audit: All shadows soft-edge

**Accessibility Compliance**
- [ ] Audit: Touch targets 48×48px
- [ ] Audit: Contrast ratios 4.5:1
- [ ] Audit: Focus visible on all interactive
- [ ] Audit: Images have alt text
- [ ] Audit: Forms have linked labels
- [ ] Audit: Dynamic content has aria-live
- [ ] Audit: Toggles have role="switch"

**Mobile-Web Parity**
- [ ] Verify: Same colors for same variants
- [ ] Verify: Same shadow treatment
- [ ] Verify: Same border width
- [ ] Verify: Same border radius
- [ ] Verify: Same touch targets
- [ ] Verify: Same component behavior

### Day 20: Fix Audit Findings

- [ ] Address any audit failures
- [ ] Re-run verification
- [ ] Final visual review

### Day 21-22: Documentation Updates

**Update Existing Docs**
- [ ] `specs/web/pages.md` - Add NB styling per page
- [ ] `specs/web/components.md` - Update token references
- [ ] `specs/web/forms.md` - Add validation UI specs
- [ ] `specs/web/data-tables.md` - Add NB table specs
- [ ] `specs/web/authentication.md` - Add login UI spec
- [ ] `specs/mobile/screens.md` - Add token mappings
- [ ] `specs/mobile/navigation.md` - Add header/tab styling
- [ ] `specs/mobile/permissions.md` - Add modal styling
- [ ] `specs/phases/README.md` - Add UX revamp section
- [ ] `specs/phases/DEPENDENCY_MATRIX.md` - Add UX dependencies

**Update STATUS.md**
- [ ] Mark all tasks complete
- [ ] Update progress percentages
- [ ] Document any deferred items

---

## Milestones

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| M1: Tokens Complete | End Week 1, Day 2 | All design tokens updated, tests pass |
| M2: Components Complete | End Week 2, Day 9 | All 26 components updated |
| M3: P0/P1 Complete | End Week 2, Day 10 | Critical pages accessible |
| M4: All Pages Complete | End Week 3, Day 17 | 22 pages + 17 screens updated |
| M5: Audit Pass | End Week 4, Day 20 | Zero critical/high issues |
| M6: Documentation Complete | End Week 4, Day 22 | All specs updated |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Token changes break tests | Medium | High | Run tests after each token change |
| Visual regression | Medium | Medium | Screenshot comparison |
| Accessibility regression | Low | High | Automated a11y testing |
| Mobile build issues | Low | Medium | Test on physical device weekly |
| Documentation drift | Low | Low | Update docs same day as code |

---

## Resources

**Parallel Work Opportunities**
- Web components and mobile components can be done in parallel
- P2/P3 pages can be parallelized across developers
- Documentation can begin once components are stable

**Dependencies**
- Mobile components depend on mobile tokens
- Web components depend on web tokens
- Pages depend on components
- Documentation depends on implementation

**Testing Requirements**
- Web: Run `npm test` after each component
- Mobile: Run `npm test` after each component
- E2E: Run after pages complete (optional in this phase)

---

## Verification Commands

### Daily Verification

```bash
# After each component change
cd apps/web && npm test && npm run lint
cd apps/mobile && npm test && npm run lint

# Quick build check
cd apps/web && npm run build
cd apps/mobile && npm run android -- --variant=release
```

### Milestone Verification

```bash
# M1: Tokens Complete
cd apps/web && npm test && npm run build
cd apps/mobile && npm test

# M2-M4: Components + Pages
cd apps/web && npm test && npm run test:e2e
cd apps/mobile && npm test

# M5: Audit Pass
# Run accessibility audit tools
npx axe-core-cli http://localhost:3001
```

---

## Rollback Checkpoints

| Checkpoint | Branch/Tag | Restore Command |
|------------|------------|-----------------|
| Before Phase 2B | `main` | `git checkout main -- apps/` |
| After Tokens | `ux-revamp-tokens` | Create tag after M1 |
| After Components | `ux-revamp-components` | Create tag after M2 |
| After Pages | `ux-revamp-pages` | Create tag after M4 |

### Creating Checkpoints
```bash
# After each milestone, create a tag
git tag -a ux-revamp-m1-tokens -m "Phase 2B: Tokens complete"
git tag -a ux-revamp-m2-components -m "Phase 2B: Components complete"
git tag -a ux-revamp-m4-pages -m "Phase 2B: Pages complete"
```

### Restoring from Checkpoint
```bash
# Restore to specific milestone
git checkout ux-revamp-m1-tokens -- apps/
```
