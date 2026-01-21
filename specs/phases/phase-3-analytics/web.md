# Phase 3 - Web Dashboard Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 2 web dashboard deployed

---

## Overview

Expand the web dashboard with comprehensive analytics pages, charts, and report builder functionality.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Analytics Pages Structure | Page layouts, data hooks |
| Day 2 | Worker Analytics | Charts, leaderboard |
| Day 3 | Area Analytics | Coverage charts, trends |
| Day 4 | Report Builder | Template UI, generation |
| Day 5 | Testing & Polish | Export, scheduling |

---

## New Pages

### Analytics Worker Page

**Path:** `app/(dashboard)/analytics/workers/page.tsx`

**Features:**
- Worker performance table with sorting
- Leaderboard (top 10 performers)
- Attendance rate trend chart
- Reports per worker chart
- Date range filter
- Area filter
- Export to CSV/Excel

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Worker Analytics              [Date Range] [Area]│
├─────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌────────────────────────┐ │
│ │ Top Performers   │ │ Attendance Trend       │ │
│ │ 1. Ahmad - 98%   │ │ [Line Chart]           │ │
│ │ 2. Siti - 96%    │ │                        │ │
│ │ ...              │ │                        │ │
│ └──────────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Performance Table                    [Export ▼] │
│ ┌─────────────────────────────────────────────┐ │
│ │ Name | Attendance | Hours | Reports | Tasks │ │
│ │─────────────────────────────────────────────│ │
│ │ Ahmad | 98% | 7.8h | 4.2/day | 95% │ │
│ │ ...   | ... | ...  | ...     | ... │ │
│ └─────────────────────────────────────────────┘ │
│ [< 1 2 3 4 5 >]                                 │
└─────────────────────────────────────────────────┘
```

**Checklist:**
- [ ] Page component created
- [ ] Date range picker
- [ ] Area filter dropdown
- [ ] Top performers card
- [ ] Attendance trend line chart
- [ ] Performance data table
- [ ] Sortable columns
- [ ] Pagination
- [ ] Export to CSV button
- [ ] Export to Excel button
- [ ] Loading states
- [ ] Error handling

---

### Analytics Area Page

**Path:** `app/(dashboard)/analytics/areas/page.tsx`

**Features:**
- Area performance table
- Coverage rate by area (bar chart)
- Condition distribution (pie chart)
- Trend comparison between areas
- Date range filter

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Area Analytics                      [Date Range]│
├─────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌────────────────────┐ │
│ │ Coverage by Area     │ │ Condition Dist.    │ │
│ │ [Bar Chart]          │ │ [Pie Chart]        │ │
│ │                      │ │ Baik: 65%          │ │
│ │                      │ │ Cukup: 30%         │ │
│ └──────────────────────┘ └────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Area Performance Table               [Export ▼] │
│ ┌─────────────────────────────────────────────┐ │
│ │ Area | Coverage | Reports | Avg Cond | Trend│ │
│ │─────────────────────────────────────────────│ │
│ │ Taman Bungkul | 100% | 450 | Baik | ↑ │ │
│ │ ...           | ...  | ... | ...  | ... │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Checklist:**
- [ ] Page component created
- [ ] Coverage bar chart
- [ ] Condition distribution pie chart
- [ ] Area performance table
- [ ] Trend indicators (improving/stable/declining)
- [ ] Date range picker
- [ ] Export functionality

---

### Analytics Dashboard Page

**Path:** `app/(dashboard)/analytics/page.tsx`

**Features:**
- Summary KPI cards
- Quick overview charts
- Links to detailed analytics

**Checklist:**
- [ ] KPI summary cards (workers, areas, reports)
- [ ] Quick trend charts
- [ ] Navigation cards to detailed pages

---

### Report Builder Page

**Path:** `app/(dashboard)/report-builder/page.tsx`

**Features:**
- Report type selector
- Metric and field selection
- Filter configuration
- Date range selection
- Preview section
- Save as template
- Schedule configuration
- Generate and download

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Report Builder                                  │
├─────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌────────────────────┐ │
│ │ Report Type          │ │ Preview            │ │
│ │ ○ Attendance Report  │ │                    │ │
│ │ ○ Performance Report │ │ [Preview content]  │ │
│ │ ○ Custom Report      │ │                    │ │
│ ├──────────────────────┤ │                    │ │
│ │ Date Range           │ │                    │ │
│ │ [Start] - [End]      │ │                    │ │
│ ├──────────────────────┤ │                    │ │
│ │ Filters              │ │                    │ │
│ │ Area: [All]          │ │                    │ │
│ │ Worker: [All]        │ │                    │ │
│ ├──────────────────────┤ │                    │ │
│ │ Metrics (Custom)     │ │                    │ │
│ │ ☑ Attendance         │ │                    │ │
│ │ ☑ Reports Count      │ │                    │ │
│ │ ☐ Task Completion    │ │                    │ │
│ └──────────────────────┘ └────────────────────┘ │
├─────────────────────────────────────────────────┤
│ [Save Template] [Schedule] [Generate PDF] [CSV] │
└─────────────────────────────────────────────────┘
```

**Checklist:**
- [ ] Report type radio selection
- [ ] Date range picker
- [ ] Area filter
- [ ] Worker filter
- [ ] Custom metric checkboxes
- [ ] Live preview panel
- [ ] Save as template dialog
- [ ] Schedule configuration dialog
- [ ] Generate PDF button
- [ ] Generate CSV button
- [ ] Generate Excel button
- [ ] Download progress indicator
- [ ] Success/error notifications

---

### Report Templates Page

**Path:** `app/(dashboard)/report-builder/templates/page.tsx`

**Features:**
- List saved templates
- Edit template
- Delete template
- Run template now
- View schedule

**Checklist:**
- [ ] Templates list table
- [ ] Edit button → open editor
- [ ] Delete button with confirmation
- [ ] Run now button
- [ ] Schedule indicator
- [ ] Last run timestamp

---

### Report Archive Page

**Path:** `app/(dashboard)/report-builder/archive/page.tsx`

**Features:**
- List generated reports
- Filter by date, type
- Download report files
- Delete old reports

**Checklist:**
- [ ] Archive list table
- [ ] Date filter
- [ ] Type filter
- [ ] Download button
- [ ] Delete button
- [ ] File size display

---

## Chart Components

### LineChart

```typescript
// components/charts/LineChart.tsx
import { LineChart as RechartsLine, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: { date: string; value: number }[];
  color?: string;
  dataKey?: string;
}

export function LineChart({ data, color = '#2E7D32', dataKey = 'value' }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLine data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
      </RechartsLine>
    </ResponsiveContainer>
  );
}
```

### BarChart

```typescript
// components/charts/BarChart.tsx
import { BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function BarChart({ data, dataKey, nameKey, color = '#2E7D32' }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBar data={data}>
        <XAxis dataKey={nameKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} />
      </RechartsBar>
    </ResponsiveContainer>
  );
}
```

### PieChart

```typescript
// components/charts/PieChart.tsx
import { PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

export function PieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPie>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
```

**Checklist:**
- [ ] LineChart component
- [ ] BarChart component
- [ ] PieChart component
- [ ] AreaChart component (optional)
- [ ] Responsive container
- [ ] Tooltips
- [ ] Legends
- [ ] Loading state
- [ ] Empty state

---

## API Hooks

```typescript
// lib/hooks/useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import * as analyticsApi from '@/lib/api/analytics';

export function useWorkerAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['workerAnalytics', filters],
    queryFn: () => analyticsApi.getWorkerAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAreaAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['areaAnalytics', filters],
    queryFn: () => analyticsApi.getAreaAnalytics(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// lib/hooks/useReports.ts
export function useGenerateReport() {
  return useMutation({
    mutationFn: (config: ReportConfig) => reportsApi.generate(config),
  });
}

export function useReportTemplates() {
  return useQuery({
    queryKey: ['reportTemplates'],
    queryFn: reportsApi.getTemplates,
  });
}
```

---

## Export Utilities

```typescript
// lib/utils/export.ts
import { saveAs } from 'file-saver';

export async function downloadReport(reportId: string, format: 'pdf' | 'csv' | 'xlsx') {
  const response = await fetch(`/api/reports/archive/${reportId}/download?format=${format}`);
  const blob = await response.blob();
  const filename = `report-${reportId}.${format}`;
  saveAs(blob, filename);
}

export function exportToCSV(data: any[], filename: string) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
}
```

---

## Testing Requirements

| Component | Tests |
|-----------|-------|
| Analytics pages | Data loading, filtering |
| Chart components | Render with data, empty state |
| Report builder | Form submission, validation |
| Export functions | File download |

---

## Success Criteria

1. Worker analytics page shows accurate metrics
2. Area analytics page shows coverage and trends
3. Charts render correctly and are interactive
4. Report builder generates PDF/CSV/Excel
5. Templates can be saved and scheduled
6. All pages are responsive

---

## Dependencies

```bash
npm install recharts        # Charts library
npm install file-saver      # File download
npm install date-fns        # Date manipulation
npm install react-day-picker # Date range picker
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
