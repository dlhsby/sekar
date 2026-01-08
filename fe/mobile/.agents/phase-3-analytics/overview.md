# Phase 3 - Analytics (Mobile)

## 🎯 Objectives

Add analytics visualization screens for workers and supervisors.

**Duration:** 3 days  
**Prerequisites:** Phase 2 deployed, backend Phase 3 complete

---

## 📅 Timeline

| Day | Focus | Screens |
|-----|-------|---------|
| Day 1 | Worker Analytics | Personal stats, trends |
| Day 2 | Supervisor Analytics | Team metrics, charts |
| Day 3 | Polish | UI improvements, testing |

---

## 📱 Screen Updates

### Worker Home Screen Enhancement

Add performance card showing:
- Weekly attendance rate
- Reports this week
- Task completion rate
- Personal trend indicator

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

### New: Worker Analytics Screen

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

### Supervisor: Team Analytics Screen

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

---

## 🏗️ New Components

```
src/
├── screens/
│   ├── worker/
│   │   └── AnalyticsScreen.tsx
│   └── supervisor/
│       └── TeamAnalyticsScreen.tsx
├── components/
│   ├── analytics/
│   │   ├── PerformanceCard.tsx
│   │   ├── StatsCard.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── LeaderboardCard.tsx
│   │   └── TrendIndicator.tsx
│   └── charts/
│       ├── LineChart.tsx
│       ├── BarChart.tsx
│       └── PieChart.tsx
└── services/
    └── api/
        └── analyticsApi.ts
```

---

## 📊 Charts Library

```bash
npm install react-native-chart-kit
# or
npm install victory-native
```

---

## ✅ Success Criteria

1. ✅ Workers see personal performance
2. ✅ Workers see weekly trends
3. ✅ Supervisors see team overview
4. ✅ Charts render correctly
5. ✅ Period selection works
6. ✅ Data loads quickly

---

*Last Updated: January 2026*

