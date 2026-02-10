# Navigation and Modal Layout Improvements

**Date:** February 8, 2026
**Status:** ✅ Completed

## Summary

Implemented three major improvements to worker modals and ClockOut screen navigation/layout:

1. Report navigation from TodayReportsModal
2. Redesigned TodayWorkHoursModal with table-style total and compact shift cards
3. Updated ClockInOutScreen collapsible card behavior

## Changes Implemented

### Task 1: Report Navigation ✅

**File:** `/fe/mobile/src/screens/worker/WorkerHomeScreen.tsx`

**Change:** Updated `handleReportPress` to navigate directly to ReportDetail screen instead of TasksReports.

```typescript
// Before
const handleReportPress = (report: any) => {
  setReportsModalVisible(false);
  navigation.navigate('TasksReports' as never);
};

// After
const handleReportPress = (report: any) => {
  setReportsModalVisible(false);
  navigation.navigate('ReportDetail', { reportId: report.id, isWorkerView: true });
};
```

**Effect:** Tapping a report in TodayReportsModal now navigates directly to the report detail screen with proper params.

---

### Task 2: TodayWorkHoursModal Redesign ✅

**File:** `/fe/mobile/src/components/modals/TodayWorkHoursModal.tsx`

#### Changes:

1. **Total Duration Calculation** - Now includes active shifts (uses current time for shifts without clock_out_time)
2. **Removed CollapsibleCard** - Replaced with simple compact cards
3. **New Layout Structure**:
   - Total Duration Section (table-style) at top
   - Section title "Riwayat Shift Hari Ini"
   - Compact shift cards with inline layout

#### New Layout:

```
┌─────────────────────────────────────┐
│ Total Jam Kerja Hari Ini     8j 30m │ <- Table style
└─────────────────────────────────────┘

Riwayat Shift Hari Ini                 <- Section title

┌─────────────────────────────────────┐
│ Shift #1                      [Aktif]│
│ Mulai: 08:00  →  Selesai: -         │
│ ⏱ 4j 15m                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Shift #2                             │
│ Mulai: 08:00  →  Selesai: 12:15     │
│ ⏱ 4j 15m                            │
└─────────────────────────────────────┘
```

#### Key Features:

- **Active Badge**: Shows pulsing dot + "Aktif" badge for running shifts
- **Compact Time Display**: Inline "Mulai" and "Selesai" times with arrow separator
- **Duration Row**: Small timer icon with formatted duration (e.g., "4j 15m")
- **Total Includes Active Shift**: Uses `new Date()` for clock_out_time if null

#### Styling Changes:

```typescript
// New styles
totalSection: {
  marginBottom: nbSpacing.md,
  backgroundColor: nbColors.background,
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  padding: nbSpacing.sm,
}

shiftCard: {
  backgroundColor: nbColors.surface,
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  padding: nbSpacing.sm,
  marginBottom: nbSpacing.sm,
  ...nbShadows.sm,
}

activeBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: nbColors.successLight,
  borderWidth: nbBorders.thin,
  borderColor: nbColors.success,
  borderRadius: nbBorderRadius.sm,
}
```

#### Imports Updated:

```typescript
// Added formatTime import
import { formatDateTime, formatDate, formatTime, calculateDuration } from '../../utils/dateUtils';

// Removed CollapsibleCard (no longer needed)
// Was: import { CollapsibleCard } from '../common';
```

---

### Task 3: ClockInOutScreen Collapsible Changes ✅

**File:** `/fe/mobile/src/screens/worker/ClockInOutScreen.tsx`

#### Change 3a: Made "Waktu Shift" Collapsible (Default Collapsed)

**Before:** NBCard with timer always visible

```tsx
<NBCard variant="elevated" style={styles.timerCard}>
  <Text style={styles.timerCardTitle}>Waktu Shift</Text>
  <CountdownTimer ... />
  <Text style={styles.clockInTimeText}>Clock In: ...</Text>
</NBCard>
```

**After:** CollapsibleCard with timer inside, starts collapsed

```tsx
<CollapsibleCard
  title="Waktu Shift"
  subtitle={`Mulai: ${formatTime(currentShift.clock_in_time)}`}
  icon="clock-outline"
  defaultExpanded={false}  // Starts collapsed
  style={styles.card}
>
  <View style={styles.shiftTimeContent}>
    <CountdownTimer ... />
    <Text style={styles.clockInTimeText}>Clock In: ...</Text>
  </View>
</CollapsibleCard>
```

**Added Style:**
```typescript
shiftTimeContent: {
  alignItems: 'center',
}
```

#### Change 3b: "Lokasi Saat Ini" Default Open

**Changed:** `defaultExpanded` from `false` to `true`

```tsx
<CollapsibleCard
  title="Lokasi Saat Ini"
  subtitle={...}
  icon="crosshairs-gps"
  defaultExpanded={true}  // Changed from false
  style={styles.card}
>
```

**Rationale:** Location is critical for clock-out validation, so it should be visible by default. Timer can be collapsed to save screen space since it's still visible in the subtitle.

---

## Testing Checklist

- [ ] Tap report in TodayReportsModal → navigates to ReportDetail
- [ ] TodayWorkHoursModal shows total duration including active shift
- [ ] Shift cards show "Aktif" badge for running shift
- [ ] Multiple shifts display correctly in compact format
- [ ] "Waktu Shift" collapsible starts collapsed in ClockOut screen
- [ ] "Lokasi Saat Ini" collapsible starts expanded in ClockOut screen
- [ ] Collapsible animations work smoothly
- [ ] All text formatting is correct (times, durations)

## Files Modified

1. `/fe/mobile/src/screens/worker/WorkerHomeScreen.tsx` - Report navigation
2. `/fe/mobile/src/components/modals/TodayWorkHoursModal.tsx` - Complete redesign
3. `/fe/mobile/src/screens/worker/ClockInOutScreen.tsx` - Collapsible behavior changes

## Design Tokens Used

All changes follow Neo Brutalism design system:
- `nbColors.*` for colors
- `nbSpacing.*` for spacing
- `nbTypography.*` for text styles
- `nbBorders.*` for border widths
- `nbBorderRadius.*` for rounded corners
- `nbShadows.*` for shadows

## Migration Notes

**Breaking Changes:** None
**Backward Compatible:** Yes
**Dependencies:** No new dependencies required

All changes use existing components and utilities from the codebase.
