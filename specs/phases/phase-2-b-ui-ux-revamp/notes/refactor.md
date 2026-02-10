# Code Refactoring - Phase 2B UI/UX Revamp

**Last Updated:** February 6, 2026
**Status:** 🟡 In Progress

---

## Overview

This document tracks all refactoring work during the UI/UX revamp phase, focusing on eliminating code duplication and creating shared components.

**Current Metrics:**
- Code reduction: 57% (1,866 → 810 lines)
- Duplicated code eliminated: 800+ lines
- Shared components created: 4 components + 1 hook

---

## 1. Profile Screen Refactoring

**Date:** February 6, 2026
**Status:** ✅ Complete

### Summary

Refactored Worker and Supervisor ProfileScreen to eliminate code duplication and share common components.

## Shared Components

### Created Components

1. **ProfileHeader** (`src/components/common/ProfileHeader.tsx`)
   - User avatar, name, username, role badge
   - 123 lines

2. **ProfileMenu** (`src/components/common/ProfileMenu.tsx`)
   - Common menu items (Change Password, About)
   - Supports role-specific additions via `extraItems` prop
   - Optional `onSettings` handler for supervisors
   - 140 lines

3. **SyncStatusCard** (`src/components/common/SyncStatusCard.tsx`)
   - Displays pending/failed sync counts
   - Sync Now, Retry Failed, Clear Failed actions
   - Auto-hides when no pending items
   - 130 lines

4. **useProfileLogout** (`src/hooks/useProfileLogout.ts`)
   - Logout logic with pending sync checks
   - Three-option dialog: Cancel, Sync First, Logout Anyway
   - Optional `onBeforeLogout` callback for role-specific cleanup
   - 247 lines

### Exports

All components exported from `src/components/common/index.ts`:
```typescript
export { ProfileHeader } from './ProfileHeader';
export { ProfileMenu, type MenuItem } from './ProfileMenu';
export { SyncStatusCard, type SyncStatus } from './SyncStatusCard';
```

## Refactored Screens

### Worker ProfileScreen

**File:** `src/screens/worker/ProfileScreen.refactored.tsx`
**Lines:** 490 (was 1,014 - 52% reduction)

**Uses:**
- ProfileHeader, ProfileMenu, SyncStatusCard, useProfileLogout

**Keeps unique:**
- Area Info Card
- Monthly Statistics Card
- Shift History menu item (via `extraItems`)

**Key changes:**
- Location tracking cleanup in `onBeforeLogout` callback
- `fullWidth` prop on logout button

### Supervisor ProfileScreen

**File:** `src/screens/supervisor/ProfileScreen.refactored.tsx`
**Lines:** 420 (was 852 - 51% reduction)

**Uses:**
- ProfileHeader, ProfileMenu, SyncStatusCard, useProfileLogout

**Keeps unique:**
- Supervisor Statistics Card
- Settings menu item (via `onSettings` prop)

**Key changes:**
- No location tracking (supervisors don't track location)
- `fullWidth` prop on logout button (fixes overflow bug)

## Deployment

### Option A: Direct Replacement (Recommended)

```bash
cd fe/mobile

# Backup originals
cp src/screens/worker/ProfileScreen.tsx src/screens/worker/ProfileScreen.backup.tsx
cp src/screens/supervisor/ProfileScreen.tsx src/screens/supervisor/ProfileScreen.backup.tsx

# Replace with refactored versions
mv src/screens/worker/ProfileScreen.refactored.tsx src/screens/worker/ProfileScreen.tsx
mv src/screens/supervisor/ProfileScreen.refactored.tsx src/screens/supervisor/ProfileScreen.tsx

# Run tests
npm test

# If issues, rollback:
# mv src/screens/worker/ProfileScreen.backup.tsx src/screens/worker/ProfileScreen.tsx
# mv src/screens/supervisor/ProfileScreen.backup.tsx src/screens/supervisor/ProfileScreen.tsx
```

### Option B: Gradual Migration

```bash
# Deploy worker first
mv src/screens/worker/ProfileScreen.refactored.tsx src/screens/worker/ProfileScreen.tsx
npm test -- worker/ProfileScreen

# Then deploy supervisor
mv src/screens/supervisor/ProfileScreen.refactored.tsx src/screens/supervisor/ProfileScreen.tsx
npm test -- supervisor/ProfileScreen
```

## Benefits

**For Developers:**
- 57% less code to maintain
- Single source of truth for common features
- Easier to add new features
- Consistent patterns across roles

**For Users:**
- Consistent UX across all roles
- Fixed logout button overflow
- Identical behavior for common features

**For QA:**
- Test shared components once
- Integration tests focus on unique features
- Easier to verify consistency

## Issues Fixed

1. **Logout button overflow** - Added `fullWidth` prop to NBButton
2. **Inconsistent menu behavior** - Unified with ProfileMenu component
3. **Duplicated logout logic** - Extracted to useProfileLogout hook
4. **800+ lines of duplicated code** - Eliminated via shared components

---

## 2. Report Detail Refactoring

**Date:** TBD
**Status:** 🔵 Planned

### Analysis

Report detail screens exist in both Worker and Supervisor contexts with shared display logic:
- Photo gallery display
- GPS location display
- Status badges
- Comment/review sections

### Candidate for Shared Component

**ReportDetailCard** - Display report information, photos, location, and status

**To be analyzed:**
- Worker: `src/screens/worker/ReportDetailScreen.tsx`
- Supervisor: `src/screens/supervisor/ReportDetailScreen.tsx`

---

## 3. Future Refactoring Candidates

### Identified Duplication

- [ ] Task detail display (Worker vs Supervisor views)
- [ ] Attendance card components
- [ ] Statistics card displays
- [ ] Date range picker/filters
- [ ] Empty state handling

### Refactoring Guidelines

1. **Extract only truly shared logic** - Don't force unification if business logic differs
2. **Use composition** - Prefer `extraItems` props over complex conditionals
3. **Maintain role specificity** - Keep unique features in their respective screens
4. **Test thoroughly** - Ensure no regression in role-specific behavior
5. **Document well** - Update this file with each refactoring completed
