# Phase 3 - Mobile Implementation Checklist

**Duration:** 3 days
**Prerequisites:** Phase 2 deployed, backend Phase 3 complete

---

## Overview

Add analytics visualization screens for workers and supervisors showing performance metrics and trends.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Worker Analytics | Personal stats, trends |
| Day 2 | Supervisor Analytics | Team metrics, charts |
| Day 3 | Polish | UI improvements, testing |

---

## Worker Analytics Screen

**Path:** `src/screens/worker/AnalyticsScreen.tsx`

### Layout

```
┌─────────────────────────────────┐
│ ←  My Performance               │
├─────────────────────────────────┤
│ Period: [This Month ▼]          │
├─────────────────────────────────┤
│ Attendance                      │
│ ┌─────────────────────────────┐ │
│ │ ■■■■■■■■■□ 95%              │ │
│ │ 19/20 days present          │ │
│ └─────────────────────────────┘ │
│                                 │
│ Average Shift Duration          │
│ 7.8 hours                       │
│                                 │
│ Reports Submitted               │
│ 68 total (3.4/day avg)          │
│                                 │
│ Task Performance                │
│ ┌─────────────────────────────┐ │
│ │ 12 assigned | 10 completed  │ │
│ │ Avg time: 45 mins           │ │
│ └─────────────────────────────┘ │
│                                 │
│ Weekly Trend                    │
│ ┌─────────────────────────────┐ │
│ │ [Line chart of reports]     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Features

- [ ] Period selector (This Week, This Month, Custom)
- [ ] Attendance rate with progress bar
- [ ] Days present count
- [ ] Average shift duration
- [ ] Reports submitted count
- [ ] Reports per day average
- [ ] Task completion rate
- [ ] Average task completion time
- [ ] Weekly trend line chart
- [ ] Loading state
- [ ] Error handling

### Implementation

```typescript
// src/screens/worker/AnalyticsScreen.tsx
import { useWorkerAnalytics } from '@/hooks/useAnalytics';
import { LineChart } from '@/components/charts/LineChart';
import { ProgressBar } from '@/components/analytics/ProgressBar';

export const AnalyticsScreen: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const { data, isLoading, error } = useWorkerAnalytics(period);

  return (
    <ScrollView>
      <PeriodSelector value={period} onChange={setPeriod} />

      <AttendanceCard
        rate={data.attendance_rate}
        daysPresent={data.days_present}
        totalDays={data.total_days}
      />

      <StatsCard title="Shift Duration" value={`${data.avg_shift_hours} hours`} />
      <StatsCard title="Reports" value={`${data.reports_count} (${data.reports_per_day}/day)`} />

      <TaskPerformanceCard
        assigned={data.tasks_assigned}
        completed={data.tasks_completed}
        avgTime={data.avg_task_time}
      />

      <WeeklyTrendChart data={data.weekly_trend} />
    </ScrollView>
  );
};
```

---

## Supervisor Team Analytics Screen

**Path:** `src/screens/supervisor/TeamAnalyticsScreen.tsx`

### Layout

```
┌─────────────────────────────────┐
│ ←  Team Analytics               │
├─────────────────────────────────┤
│ Period: [This Week ▼]           │
├─────────────────────────────────┤
│ Summary                         │
│ • 28/30 workers active          │
│ • 450 reports submitted         │
│ • 93% average attendance        │
│                                 │
│ Top Performers                  │
│ 1. Ahmad Rizki - 98%            │
│ 2. Siti N. - 96%                │
│ 3. Dimas P. - 95%               │
│                                 │
│ Area Coverage                   │
│ ┌─────────────────────────────┐ │
│ │ [Bar chart by area]         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Reports by Condition            │
│ ┌─────────────────────────────┐ │
│ │ [Pie chart]                 │ │
│ │ Baik: 65% Cukup: 30%...     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Features

- [ ] Period selector (This Week, This Month)
- [ ] Team summary stats card
- [ ] Top performers leaderboard (top 5)
- [ ] Area coverage bar chart
- [ ] Reports by condition pie chart
- [ ] Filter by area
- [ ] Pull to refresh
- [ ] Loading state
- [ ] Error handling

---

## Home Screen Enhancement

Add performance card to worker home screen showing quick stats.

### Performance Card

```
┌─────────────────────────────────┐
│ Your Performance This Week      │
├─────────────────────────────────┤
│ ✓ 100% Attendance               │
│ 📝 15 Reports (↑ 3)             │
│ ✓ 4/5 Tasks Completed           │
│                 [View Details]  │
└─────────────────────────────────┘
```

**Checklist:**
- [ ] PerformanceCard component
- [ ] Fetch weekly summary
- [ ] Attendance indicator
- [ ] Reports with trend indicator
- [ ] Task completion count
- [ ] Navigate to full analytics

---

## New Components

### Charts

```
src/components/charts/
├── LineChart.tsx       # Weekly trend
├── BarChart.tsx        # Area coverage
├── PieChart.tsx        # Condition distribution
└── ProgressBar.tsx     # Attendance rate
```

**Chart Library:**
```bash
npm install react-native-chart-kit
# OR
npm install victory-native
```

### Analytics Components

```
src/components/analytics/
├── PerformanceCard.tsx
├── StatsCard.tsx
├── LeaderboardCard.tsx
├── TrendIndicator.tsx
└── PeriodSelector.tsx
```

---

## API Integration

### Analytics API

```typescript
// src/services/api/analyticsApi.ts
export const analyticsApi = {
  getMyAnalytics: (period: 'week' | 'month') =>
    apiClient.get('/analytics/workers/me', { params: { period } }),

  getTeamAnalytics: (period: 'week' | 'month', areaId?: number) =>
    apiClient.get('/analytics/workers', {
      params: { period, area_id: areaId },
    }),

  getAreaAnalytics: (period: 'week' | 'month') =>
    apiClient.get('/analytics/areas', { params: { period } }),
};
```

### Hooks

```typescript
// src/hooks/useAnalytics.ts
export function useWorkerAnalytics(period: 'week' | 'month') {
  return useQuery({
    queryKey: ['workerAnalytics', period],
    queryFn: () => analyticsApi.getMyAnalytics(period),
  });
}

export function useTeamAnalytics(period: 'week' | 'month') {
  return useQuery({
    queryKey: ['teamAnalytics', period],
    queryFn: () => analyticsApi.getTeamAnalytics(period),
  });
}
```

---

## Navigation Updates

### Worker Navigator
- [ ] Add Analytics tab or button
- [ ] Navigate from home screen performance card

### Supervisor Navigator
- [ ] Add Team Analytics screen
- [ ] Navigate from dashboard

---

## Testing Requirements

| Feature | Tests |
|---------|-------|
| Worker Analytics | Data loading, period change |
| Team Analytics | Summary display, leaderboard |
| Charts | Render with data, empty state |
| Performance Card | Display, navigation |

---

## Success Criteria

1. Workers see personal performance metrics
2. Workers see weekly/monthly trends
3. Supervisors see team overview
4. Charts render correctly with data
5. Period selection works
6. Data loads within 2 seconds

---

## Dependencies

```bash
npm install react-native-chart-kit
# OR
npm install victory-native
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
