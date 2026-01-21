# Phase 3 - Analytics & Reporting: Testing Plan

---

## Overview

This document outlines testing requirements for analytics queries, report generation, scheduling, and visualization components.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| Analytics | >80% | High |
| Report Builder | >80% | High |
| Scheduler | >80% | Medium |
| Web Charts | >70% | Medium |
| Mobile Analytics | >70% | Medium |

---

## Backend Unit Tests

### Analytics Module

```typescript
describe('AnalyticsService', () => {
  // Worker Analytics
  describe('getWorkerAnalytics', () => {
    it('should return worker performance metrics');
    it('should filter by date range');
    it('should filter by area');
    it('should calculate attendance rate correctly');
    it('should calculate reports per day correctly');
    it('should calculate task completion rate');
    it('should handle empty results');
    it('should return within 2 seconds for 500 workers');
  });

  // Area Analytics
  describe('getAreaAnalytics', () => {
    it('should return area metrics');
    it('should calculate coverage rate correctly');
    it('should determine condition trend');
    it('should identify peak hours');
    it('should filter by date range');
  });

  // Operational Analytics
  describe('getOperationalAnalytics', () => {
    it('should return daily/weekly/monthly hours');
    it('should return system usage stats');
    it('should aggregate data correctly');
  });

  // Dashboard Summary
  describe('getDashboardSummary', () => {
    it('should return aggregated KPIs');
    it('should return within 1 second');
  });
});
```

### Report Builder Module

```typescript
describe('ReportBuilderService', () => {
  // Template CRUD
  describe('templates', () => {
    it('should create template with valid config');
    it('should validate template config schema');
    it('should update existing template');
    it('should delete template');
    it('should list user templates');
  });

  // Report Generation
  describe('generate', () => {
    it('should generate PDF report');
    it('should generate CSV report');
    it('should generate Excel report');
    it('should upload to S3');
    it('should record in archive');
    it('should complete within 30 seconds');
  });
});

describe('PdfGenerator', () => {
  it('should generate valid PDF buffer');
  it('should render HTML template correctly');
  it('should include charts as images');
  it('should handle empty data');
});

describe('CsvGenerator', () => {
  it('should generate valid CSV string');
  it('should escape special characters');
  it('should handle null values');
  it('should include headers');
});

describe('ExcelGenerator', () => {
  it('should generate valid Excel buffer');
  it('should format headers');
  it('should apply styling');
  it('should handle large datasets');
});
```

### Scheduler Module

```typescript
describe('SchedulerService', () => {
  it('should execute daily report job');
  it('should execute weekly report job');
  it('should find templates by schedule');
  it('should send email with attachment');
  it('should update last_run_at');
  it('should log job execution');
  it('should handle job failures gracefully');
});

describe('EmailService', () => {
  it('should send email via SES');
  it('should attach PDF file');
  it('should handle multiple recipients');
  it('should use correct email template');
});
```

---

## Performance Tests

### Query Performance

```typescript
describe('Analytics Performance', () => {
  // Setup: Seed database with production-like data
  // - 500 workers
  // - 50 areas
  // - 1 million location pings
  // - 100K reports

  it('worker analytics should return in <2s', async () => {
    const start = Date.now();
    await analyticsService.getWorkerAnalytics({
      start_date: '2025-12-01',
      end_date: '2025-12-31',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('area analytics should return in <2s', async () => {
    const start = Date.now();
    await analyticsService.getAreaAnalytics({
      start_date: '2025-12-01',
      end_date: '2025-12-31',
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('dashboard should return in <1s', async () => {
    const start = Date.now();
    await analyticsService.getDashboardSummary();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

### Report Generation Performance

```typescript
describe('Report Generation Performance', () => {
  it('PDF report should generate in <30s', async () => {
    const start = Date.now();
    await reportService.generate({
      type: 'attendance',
      format: 'pdf',
      date_range: { start: '2025-12-01', end: '2025-12-31' },
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  it('CSV export should handle 10K rows in <5s', async () => {
    const start = Date.now();
    await reportService.generate({
      type: 'attendance',
      format: 'csv',
      date_range: { start: '2025-01-01', end: '2025-12-31' },
    });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

---

## Web Dashboard Tests

### Component Tests

```typescript
describe('LineChart', () => {
  it('should render with data');
  it('should show tooltip on hover');
  it('should handle empty data');
  it('should be responsive');
});

describe('BarChart', () => {
  it('should render bars for each data point');
  it('should show values on hover');
  it('should handle large datasets');
});

describe('PieChart', () => {
  it('should render pie segments');
  it('should show legend');
  it('should display percentages');
});

describe('WorkerAnalyticsPage', () => {
  it('should load worker data');
  it('should filter by date range');
  it('should filter by area');
  it('should sort table columns');
  it('should paginate results');
  it('should export to CSV');
});

describe('ReportBuilderPage', () => {
  it('should render report type options');
  it('should update preview on config change');
  it('should save template');
  it('should generate PDF');
  it('should download file');
});
```

### Integration Tests

```typescript
describe('Analytics Integration', () => {
  it('should fetch and display worker analytics');
  it('should update charts on filter change');
  it('should generate and download report');
});
```

---

## Mobile Tests

```typescript
describe('AnalyticsScreen (Worker)', () => {
  it('should render attendance rate');
  it('should render shift hours');
  it('should render reports count');
  it('should render task completion');
  it('should render trend chart');
  it('should change period');
  it('should refresh data');
});

describe('TeamAnalyticsScreen (Supervisor)', () => {
  it('should render team summary');
  it('should render leaderboard');
  it('should render coverage chart');
  it('should render condition pie chart');
});

describe('PerformanceCard', () => {
  it('should display weekly stats');
  it('should show trend indicators');
  it('should navigate to analytics');
});
```

---

## Test Data

### Seed Data for Performance Testing

```sql
-- Generate 500 workers
INSERT INTO users (username, full_name, role, ...)
SELECT
  'worker' || generate_series,
  'Worker ' || generate_series,
  'Worker',
  ...
FROM generate_series(1, 500);

-- Generate 1 year of shifts (approx 100K records)
INSERT INTO shifts (worker_id, clock_in_time, clock_out_time, ...)
SELECT
  (random() * 500 + 1)::int,
  date '2025-01-01' + (random() * 365)::int + time '08:00:00',
  date '2025-01-01' + (random() * 365)::int + time '16:00:00',
  ...
FROM generate_series(1, 100000);

-- Generate 100K reports
INSERT INTO work_reports (submitted_by, area_id, condition, ...)
SELECT
  (random() * 500 + 1)::int,
  (random() * 50 + 1)::int,
  (ARRAY['Baik', 'Cukup', 'Buruk'])[floor(random() * 3 + 1)],
  ...
FROM generate_series(1, 100000);
```

---

## Acceptance Criteria

### Analytics Feature
- [ ] Worker analytics shows accurate metrics
- [ ] Area analytics shows accurate metrics
- [ ] Dashboard summary loads quickly (<1s)
- [ ] All queries return within 2 seconds
- [ ] Data matches expected calculations
- [ ] Tests pass with >80% coverage

### Report Builder Feature
- [ ] PDF reports generate correctly
- [ ] CSV exports are valid
- [ ] Excel exports are valid
- [ ] Templates can be saved and loaded
- [ ] Reports can be scheduled
- [ ] Tests pass with >80% coverage

### Scheduler Feature
- [ ] Daily reports sent at scheduled time
- [ ] Weekly reports sent at scheduled time
- [ ] Email delivery successful
- [ ] Job failures are logged
- [ ] Tests pass with >80% coverage

### Web Dashboard
- [ ] Charts render with real data
- [ ] Filters work correctly
- [ ] Export downloads work
- [ ] Tests pass with >70% coverage

### Mobile
- [ ] Analytics screens display correctly
- [ ] Charts render on mobile
- [ ] Period selection works
- [ ] Tests pass with >70% coverage

---

## Sign-Off

| Test Type | Tester | Date | Status |
|-----------|--------|------|--------|
| Unit Tests (Backend) | | | |
| Performance Tests | | | |
| Unit Tests (Web) | | | |
| Unit Tests (Mobile) | | | |
| Integration Tests | | | |
| UAT | | | |

---

**Last Updated:** 2026-01-16
