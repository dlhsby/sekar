# Phase 5: Reporting Module Deep Dive

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 ExportModule (Complete)
**Related Sub-Phase:** 5-1
**Related ADRs:** [ADR-024](../../architecture/decisions/ADR-024-pdf-report-generation.md), [ADR-018](../../architecture/decisions/ADR-018-export-format-strategy.md)

---

## Overview

The Reporting Module extends Phase 4's ExportModule with structured report generation. While ExportModule handles raw data export (CSV/Excel of entity tables), the Reporting Module generates formatted, analysis-ready reports with KPIs, charts, and aggregated data across multiple entities.

---

## A. Report Types (6)

### A1. Daily Operations Report (Laporan Operasional Harian)

**Frequency:** Auto-generated daily at 06:00 WIB
**Audience:** `kepala_rayon`, `top_management`, `admin_system`, `superadmin`
**Scope:** Per-rayon or system-wide

**Sections:**
1. **Header** — Date, rayon name (or "Seluruh Rayon"), generated timestamp
2. **Attendance Summary** — Total scheduled, attended, absent, late arrivals; attendance rate %
3. **Task Summary** — New tasks, completed, in-progress, overdue; completion rate %
4. **Activity Summary** — Submitted, approved, rejected, pending; approval rate %
5. **Monitoring Alerts** — Outside-area events, missing worker events, resolution status
6. **Overtime Summary** — Requests, approved, total hours
7. **Key Metrics Table** — Per-area breakdown of attendance, tasks, activities

**Data Sources:**
- `shifts` (clock-in/out times)
- `schedules` + `shift_definitions` (expected attendance)
- `tasks` (status counts)
- `activities` (status counts)
- `audit_logs` WHERE entity_type = 'user_tracking_status' (monitoring events)
- `overtimes` (approved hours)

**Filters:** `date` (required), `rayonId` (optional — null = system-wide)

### A2. Weekly Performance Report (Laporan Kinerja Mingguan)

**Frequency:** Auto-generated Monday 07:00 WIB
**Audience:** `kepala_rayon`, `top_management`, `admin_system`, `superadmin`
**Scope:** Per-rayon

**Sections:**
1. **Header** — Week number, date range, rayon name
2. **Attendance Trend** — Daily attendance chart data (7 days)
3. **Task Completion** — Completion rate trend, top performers
4. **Worker Ranking** — Top 10 and bottom 10 by performance score
5. **Area Comparison** — Staffing coverage, task backlog per area
6. **Week-over-Week Comparison** — Delta vs previous week

**Data Sources:** `worker_performance_daily` materialized view, `area_metrics_daily` materialized view

**Filters:** `weekStartDate` (required), `rayonId` (required)

### A3. Monthly Summary Report (Laporan Rangkuman Bulanan)

**Frequency:** Auto-generated 1st of month 08:00 WIB
**Audience:** `top_management`, `admin_system`, `superadmin`
**Scope:** System-wide

**Sections:**
1. **Executive Summary** — Key KPIs with trend arrows (up/down/flat)
2. **KPI Dashboard** — All 19 KPIs with monthly values
3. **Attendance Analysis** — Monthly rate, trend chart, worst days
4. **Task Analysis** — Throughput, avg completion time, overdue rate
5. **Overtime Analysis** — Total hours, cost estimate, top overtime workers
6. **Area Coverage** — Rayon-by-rayon comparison table
7. **Recommendations** — Auto-generated based on KPI thresholds

**Data Sources:** `operational_metrics_daily`, `worker_performance_daily`, `area_metrics_daily` materialized views

### A4. Worker Performance Report (Laporan Kinerja Pekerja)

**Frequency:** On-demand
**Audience:** `korlap` (own workers), `kepala_rayon`, `admin_system`, `superadmin`
**Scope:** Individual worker

**Sections:**
1. **Worker Profile** — Name, role, area, rayon, employee_id
2. **Attendance Record** — Calendar heatmap data, rate, late count
3. **Punctuality** — Average clock-in deviation from shift start
4. **Task Performance** — Assigned, completed, avg duration
5. **Activity Performance** — Submitted, approved, rejection reasons
6. **Area Compliance** — % within boundary, trail visualization data
7. **Overtime Record** — Hours, frequency
8. **Performance Score** — Composite score with breakdown

**Filters:** `workerId` (required), `startDate`, `endDate`

### A5. Area Status Report (Laporan Status Area)

**Frequency:** On-demand
**Audience:** `korlap`, `kepala_rayon`, `admin_system`, `superadmin`
**Scope:** Individual area

**Sections:**
1. **Area Profile** — Name, rayon, boundary info, coordinates
2. **Staffing** — Current assignment count, attendance trends
3. **Task Status** — Open, completed, overdue by priority
4. **Maintenance Status** — Asset count, upcoming maintenance, overdue
5. **Coverage Quality** — Geofence compliance %, outside-area frequency
6. **Worker Performance** — Area workers ranked by score

**Filters:** `areaId` (required), `startDate`, `endDate`

### A6. Overtime Utilization Report (Laporan Utilisasi Lembur)

**Frequency:** On-demand
**Audience:** `kepala_rayon`, `top_management`, `admin_system`, `superadmin`
**Scope:** Per-rayon or system-wide

**Sections:**
1. **Summary** — Total requests, approved/rejected ratio, total hours
2. **Cost Estimate** — Based on configurable hourly rate
3. **Worker Breakdown** — Hours per worker, sorted by total
4. **Trend** — Weekly overtime hours chart data
5. **Approval Efficiency** — Avg time from request to approval/rejection
6. **Rayon Comparison** — Overtime distribution across rayons

**Filters:** `startDate`, `endDate`, `rayonId` (optional)

---

## B. PDF Template Design

### B1. Template Engine

Handlebars (`.hbs`) templates compiled server-side with data injection.

**Common template structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* A4 page styling */
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
    .header { background: #1a1a1a; color: white; padding: 20px; }
    .logo { float: left; } .title { float: right; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    .kpi-card { display: inline-block; width: 30%; padding: 15px; margin: 5px; border: 2px solid #000; }
    .kpi-value { font-size: 28px; font-weight: bold; }
    .kpi-label { font-size: 12px; color: #666; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h1>{{reportTitle}}</h1>
      <p>{{dateRange}} | {{scopeName}}</p>
    </div>
  </div>
  {{> sections}}
  <div class="footer">
    Dihasilkan oleh SEKAR pada {{generatedAt}} | Halaman {{page}} dari {{totalPages}}
  </div>
</body>
</html>
```

### B2. Chart Rendering in PDF

Charts are rendered as SVG within the HTML template (no external chart library needed — Puppeteer renders SVG natively).

**Approach:** Generate SVG chart strings in the report service, inject into Handlebars template as `{{{chartSvg}}}` (triple braces for unescaped HTML).

```typescript
// Simple bar chart SVG generator (no external dependency)
function generateBarChartSvg(data: { label: string; value: number }[], width = 600, height = 300): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 40) / data.length;
  const bars = data.map((d, i) => {
    const barHeight = (d.value / maxValue) * (height - 60);
    return `<rect x="${20 + i * barWidth}" y="${height - 30 - barHeight}" width="${barWidth - 4}" height="${barHeight}" fill="#1a1a1a"/>
            <text x="${20 + i * barWidth + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="10">${d.label}</text>`;
  }).join('');
  return `<svg width="${width}" height="${height}">${bars}</svg>`;
}
```

---

## C. CSV/Excel Format Specifications

### C1. CSV Columns by Report Type

**Daily Operations CSV:**
```
date,area_name,rayon_name,scheduled_workers,attended_workers,attendance_rate,tasks_created,tasks_completed,activities_submitted,activities_approved,overtime_hours,outside_area_events,missing_events
```

**Worker Performance CSV:**
```
worker_id,full_name,role,area_name,rayon_name,attendance_rate,punctuality_score,task_completion_rate,avg_task_duration_hours,activity_submission_rate,activity_approval_rate,area_compliance_percent,overtime_hours,performance_score,grade
```

### C2. Excel Formatting

Excel reports use `exceljs` (already installed via Phase 4):

- **Header row:** Bold, background #1a1a1a, white text
- **Alternating rows:** White / light gray (#f5f5f5)
- **KPI values:** Number format with 1 decimal place
- **Percentages:** Format `0.0%`
- **Dates:** Format `DD/MM/YYYY`
- **Sheet names:** Indonesian (e.g., "Ringkasan", "Detail Pekerja", "Detail Area")

---

## D. Scheduled Reports Configuration

### D1. Default Schedules

| Schedule | Template | Frequency | Time (WIB) | Parameters |
|----------|----------|-----------|------------|------------|
| Laporan Harian - Rayon Utara | daily-operations | Daily | 06:00 | `{ rayonId: "rayon-utara-uuid" }` |
| Laporan Harian - Rayon Selatan | daily-operations | Daily | 06:00 | `{ rayonId: "rayon-selatan-uuid" }` |
| (... one per rayon ...) | | | | |
| Laporan Mingguan - All Rayons | weekly-performance | Weekly Mon | 07:00 | `{ rayonId: null }` |
| Laporan Bulanan - Sistem | monthly-summary | Monthly 1st | 08:00 | `{}` |

### D2. Schedule Management API

Admin can create custom schedules:

```typescript
export class CreateScheduleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUUID()
  templateId: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: string;

  @IsString()
  @Matches(/^\d{1,2} \d{1,2} .+$/)  // Basic cron validation
  cronExpression: string;

  @IsOptional()
  parameters?: Record<string, unknown>;
}
```

---

## E. Access Control Matrix

| Report Type | satgas | linmas | korlap | admin_data | kepala_rayon | top_management | admin_system | superadmin |
|-------------|--------|--------|--------|------------|-------------|----------------|--------------|------------|
| Daily Operations | - | - | Own area | - | Own rayon | All | All | All |
| Weekly Performance | - | - | Own area | - | Own rayon | All | All | All |
| Monthly Summary | - | - | - | - | - | All | All | All |
| Worker Performance | Own only | Own only | Team | - | Rayon workers | All | All | All |
| Area Status | - | - | Own area | - | Own rayon areas | All | All | All |
| Overtime Utilization | - | - | Own area | - | Own rayon | All | All | All |

---

**Last Updated:** 2026-03-13
