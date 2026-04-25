# Phase 5: Analytics Module Deep Dive

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Redis (Complete)
**Related Sub-Phase:** 5-2
**Related ADRs:** [ADR-025](../../architecture/decisions/ADR-025-analytics-materialized-views.md)

---

## Overview

The Analytics Module provides KPI calculations and dashboard data for all roles. It reads from 3 materialized views (refreshed nightly at 05:00 WIB) with Redis caching (5-min TTL) for sub-second response times. The module does NOT modify any data — it is read-only.

---

## A. Worker KPIs (8 Metrics)

### A1. Attendance Rate

**Formula:** `(days_attended / days_scheduled) * 100`
**Data Source:** `worker_performance_daily.attended` vs `schedules` count
**Target:** >= 90% (grade A), >= 80% (B), >= 70% (C)
**Weight in composite:** 25%

### A2. Punctuality Score

**Formula:** `(on_time_arrivals / total_arrivals) * 100`
**Definition:** On-time = clock_in within 15 minutes of shift start time
**Data Source:** `worker_performance_daily.late_minutes` — count where `late_minutes <= 15`
**Target:** >= 90% (grade A)
**Weight in composite:** 15%

### A3. Task Completion Rate

**Formula:** `(completed_tasks / assigned_tasks) * 100`
**Data Source:** `worker_performance_daily.completed_tasks / total_tasks`
**Target:** >= 85% (grade A)
**Weight in composite:** 20%

### A4. Average Task Duration

**Formula:** `AVG(completed_at - created_at)` in hours
**Data Source:** Raw `tasks` table query for completed tasks in period
**Display:** Hours with 1 decimal (e.g., "4.2 jam")
**Weight in composite:** N/A (informational only)

### A5. Activity Submission Rate

**Formula:** `(days_with_activity / days_attended) * 100`
**Data Source:** `worker_performance_daily.total_activities > 0` count vs `attended` count
**Target:** >= 80%
**Weight in composite:** 15%

### A6. Activity Approval Rate

**Formula:** `(approved_activities / total_activities) * 100`
**Data Source:** `worker_performance_daily.approved_activities / total_activities`
**Target:** >= 85%
**Weight in composite:** 10%

### A7. Area Compliance Percentage

**Formula:** `(within_area_pings / total_pings) * 100`
**Data Source:** `worker_performance_daily.within_area_pings / total_pings`
**Note:** Only accurate from Phase 4 go-live (backfilled data lacks boundary info)
**Target:** >= 95%
**Weight in composite:** 15%

### A8. Overtime Hours

**Formula:** `SUM(approved_overtime_hours)` in period
**Data Source:** `worker_performance_daily.overtime_hours`
**Display:** Hours with 1 decimal (e.g., "12.5 jam")
**Weight in composite:** N/A (informational only)

---

## B. Area KPIs (5 Metrics)

### B1. Staffing Coverage Ratio

**Formula:** `(attended_workers / required_workers) * 100`
**Data Source:** `area_metrics_daily.attended_workers / required_workers`
**Target:** >= 100% (fully staffed)

### B2. Task Backlog

**Formula:** `COUNT(tasks WHERE status NOT IN ('completed', 'cancelled'))`
**Data Source:** Raw `tasks` table query, scoped to area
**Display:** Integer count
**Alert threshold:** > 20 open tasks

### B3. Maintenance Frequency

**Formula:** `COUNT(asset_maintenances WHERE status = 'completed') / months_in_period`
**Data Source:** `asset_maintenances` table (Phase 5 new)
**Display:** Per-month average

### B4. Incident Rate

**Formula:** `(outside_area_events + missing_events) / days_in_period`
**Data Source:** `area_metrics_daily` monitoring event counts
**Target:** < 2 per day

### B5. Average Worker Performance

**Formula:** `AVG(performanceScore)` of all workers in area
**Data Source:** Calculated from `worker_performance_daily` composite scores
**Display:** Score 0-100 with grade letter

---

## C. Operational KPIs (6 Metrics)

### C1. System Attendance Rate

**Formula:** `(total_attended / total_scheduled) * 100` system-wide
**Data Source:** `operational_metrics_daily.total_attended / total_scheduled`

### C2. Task Throughput

**Formula:** `tasks_completed / days_in_period` (tasks per day)
**Data Source:** `operational_metrics_daily.tasks_completed`

### C3. Average Response Time

**Formula:** `AVG(task_completed_at - task_created_at)` in hours
**Data Source:** `operational_metrics_daily.avg_task_duration_hours`

### C4. Overtime Ratio

**Formula:** `overtime_hours / (attended_workers * 8)` (overtime vs regular hours)
**Data Source:** `operational_metrics_daily.overtime_total_hours / (total_attended * 8)`

### C5. Worker Utilization

**Formula:** `(workers_with_active_shift / total_active_workers) * 100`
**Data Source:** `operational_metrics_daily.total_attended / active_workers`

### C6. Geofence Compliance

**Formula:** System-wide `within_area_pings / total_pings * 100`
**Data Source:** Aggregated from `location_daily_summaries`

---

## D. Dashboard Summary

### D1. Dashboard Endpoint Response

`GET /analytics/dashboard` returns a condensed view for all roles:

```typescript
interface DashboardSummaryDto {
  // Today's snapshot
  today: {
    attendanceRate: number;
    activeWorkers: number;
    tasksCompleted: number;
    activitiesSubmitted: number;
    openTasks: number;
    overtimeHours: number;
  };
  // 7-day trends (array of 7 daily values)
  trends: {
    attendance: number[];     // Last 7 days attendance rate
    taskCompletion: number[]; // Last 7 days task completion
    activities: number[];     // Last 7 days activity count
  };
  // Alerts (items requiring attention)
  alerts: {
    understaffedAreas: { areaId: string; areaName: string; deficit: number }[];
    overdueMaintenances: number;
    missingWorkers: number;
    overdueTasks: number;
  };
}
```

### D2. Role-Based Dashboard Scoping

| Role | Dashboard Scope |
|------|----------------|
| `satgas`, `linmas` | Own metrics only (attendanceRate, tasksCompleted, etc.) |
| `korlap` | Assigned area(s) — multi-area via `user_areas` |
| `admin_data` | Same as korlap (own area) |
| `kepala_rayon` | Own rayon (all areas in rayon) |
| `top_management` | System-wide |
| `admin_system`, `superadmin` | System-wide |

---

## E. Data Aggregation Strategy (ADR-025)

### E1. Materialized Views vs Cron Aggregation

**Decision: Materialized Views** (see ADR-025)

**Rationale:**
- Materialized views are maintained by PostgreSQL — no custom aggregation code
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` does not block reads
- 90-day rolling window keeps views manageable (~50K-100K rows each)
- Redis cache on top provides sub-second response for dashboard

**Trade-offs:**
- Views are stale until next refresh (max 24h for nightly, 5min for cached)
- First query after cache expiry hits materialized view (~100-500ms)
- View definitions are complex SQL — changes require migration

### E2. Refresh Timing

| Event | Refresh Strategy |
|-------|-----------------|
| Nightly (05:00 WIB) | Full CONCURRENTLY refresh of all 3 views |
| On-demand (admin) | POST /analytics/refresh — immediate refresh |
| Redis cache miss | Read from materialized view, cache 5 min |
| Real-time data | NOT provided — analytics are always slightly stale |

> **Important:** Analytics are NOT real-time. They reflect data as of the last nightly refresh. For real-time monitoring, use the existing MonitoringModule (Phase 2D).

---

## F. Chart Specifications (Web)

### F1. Chart Library

Web dashboards use **Recharts** (already available in web project dependencies).

### F2. Chart Types by Dashboard

| Chart | Type | Data | Location |
|-------|------|------|----------|
| Attendance Trend | Line chart | 7/30/90 day trend | Analytics dashboard |
| Task Completion | Bar chart | Daily completion count | Analytics dashboard |
| Worker Ranking | Horizontal bar | Top/bottom 10 by score | Worker analytics |
| Area Comparison | Grouped bar | Staffing + tasks per area | Area analytics |
| Overtime Distribution | Pie chart | Hours by rayon | Operational analytics |
| Performance Score Distribution | Histogram | Score buckets (10-point) | Worker analytics |
| KPI Trend | Sparkline | 7-day mini trend | Dashboard cards |

### F3. Chart Color Palette (Neo Brutalism)

```typescript
const CHART_COLORS = {
  primary: '#1a1a1a',    // Black — primary data
  secondary: '#666666',  // Gray — secondary data
  accent: '#FF6B35',     // Orange — highlights/alerts
  success: '#2ECC71',    // Green — positive metrics
  warning: '#F39C12',    // Yellow — attention needed
  danger: '#E74C3C',     // Red — critical/negative
  background: '#FFFFFF', // White — chart background
  grid: '#E0E0E0',       // Light gray — grid lines
};
```

---

## G. Mobile Chart Specifications

### G1. Chart Library

Mobile uses **react-native-chart-kit** or **Victory Native** for chart rendering.

### G2. Mobile Dashboard Layout

Worker role sees:
- Performance score card (large number + grade)
- Attendance calendar heatmap (30 days)
- Task completion mini bar chart (7 days)

Supervisor role sees:
- Team performance summary cards
- Area staffing status
- Top/bottom performers list

---

**Last Updated:** 2026-03-13
