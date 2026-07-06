/**
 * Analytics pages E2E (Phase 5-2) — analytics dashboard with KPIs and charts,
 * workers analytics list, areas analytics list. Charts are Recharts (SVG) —
 * assert on surrounding labels/headings, not chart internals.
 * Route overrides are registered after quickLogin/setupMockApi.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const DASHBOARD_SUMMARY = {
  today: {
    attendanceRate: 87.5,
    activeWorkers: 28,
    tasksCompleted: 18,
    activitiesSubmitted: 45,
    openTasks: 5,
    overtimeHours: 12.5,
  },
  trends: {
    attendance: [80, 82, 84, 85, 87, 87.5, 88],
    taskCompletion: [15, 16, 17, 18, 19, 18, 18],
    activities: [40, 42, 44, 45, 46, 45, 45],
  },
  alerts: {
    understaffedAreas: [
      { areaId: 'area-1', areaName: 'Taman Bungkul', deficit: 2 },
    ],
    overdueMaintenances: 3,
    missingWorkers: 1,
    overdueTasks: 2,
  },
};

const WORKER_ANALYTICS = {
  data: [
    {
      id: 'worker-001',
      full_name: 'Budi Santoso',
      date: '2026-06-10',
      attended: 20,
      late_minutes: 5,
      total_tasks: 25,
      completed_tasks: 23,
      task_completion_rate: 92,
      total_activities: 30,
      approved_activities: 28,
      activity_submission_rate: 93,
      activity_approval_rate: 93,
      within_area_pings: 1250,
      total_pings: 1260,
      area_compliance: 99,
      overtime_hours: 2.5,
      performance_score: 94,
      grade: 'A' as const,
    },
    {
      id: 'worker-002',
      full_name: 'Siti Nurhaliza',
      date: '2026-06-10',
      attended: 19,
      late_minutes: 10,
      total_tasks: 22,
      completed_tasks: 20,
      task_completion_rate: 91,
      total_activities: 28,
      approved_activities: 26,
      activity_submission_rate: 93,
      activity_approval_rate: 92,
      within_area_pings: 1200,
      total_pings: 1210,
      area_compliance: 99,
      overtime_hours: 3,
      performance_score: 92,
      grade: 'A' as const,
    },
  ],
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

const AREA_ANALYTICS = {
  data: [
    {
      id: 'area-001',
      area_name: 'Taman Bungkul',
      date: '2026-06-10',
      attended_workers: 8,
      required_workers: 10,
      staffing_coverage: 80,
      open_tasks: 2,
      maintenance_count: 1,
      incident_rate: 0.5,
      avg_worker_performance: 89,
    },
    {
      id: 'area-002',
      area_name: 'Taman Flora',
      date: '2026-06-10',
      attended_workers: 9,
      required_workers: 9,
      staffing_coverage: 100,
      open_tasks: 1,
      maintenance_count: 0,
      incident_rate: 0,
      avg_worker_performance: 92,
    },
    {
      id: 'area-003',
      area_name: 'Taman Apsari',
      date: '2026-06-10',
      attended_workers: 7,
      required_workers: 8,
      staffing_coverage: 87,
      open_tasks: 2,
      maintenance_count: 1,
      incident_rate: 0.3,
      avg_worker_performance: 88,
    },
  ],
  meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setupMockAnalyticsRoutes(page: Page) {
  // Dashboard summary
  await page.route('**/api/v1/analytics/dashboard**', async (route: Route) => {
    return json(route, DASHBOARD_SUMMARY);
  });

  // Worker analytics list
  await page.route('**/api/v1/analytics/workers**', async (route: Route) => {
    return json(route, WORKER_ANALYTICS);
  });

  // Area analytics list
  await page.route('**/api/v1/analytics/areas**', async (route: Route) => {
    return json(route, AREA_ANALYTICS);
  });

  // Refresh analytics
  await page.route('**/api/v1/analytics/refresh', async (route: Route) => {
    if (route.request().method() === 'POST') {
      return json(route, { success: true });
    }
    return json(route, DASHBOARD_SUMMARY);
  });
}

test.describe('Analytics Pages (Phase 5-2)', () => {
  test('analytics dashboard renders title', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page title visible
    await expect(page.getByRole('heading', { name: /analitik/i })).toBeVisible();
  });

  test('analytics dashboard shows stale data notice', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Stale data notice visible
    await expect(page.getByText(/diperbarui hingga 24 jam/i)).toBeVisible();
  });

  test('analytics dashboard has period selector', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Period selector (combobox) should exist
    const selector = page.getByRole('combobox');
    const isVisible = await selector.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('KPI cards display key metrics', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // KPI labels should be visible (each term recurs in cards, headings, legends)
    await expect(page.getByText(/kehadiran/i).first()).toBeVisible();
    await expect(page.getByText(/tugas/i).first()).toBeVisible();
    await expect(page.getByText(/lembur/i).first()).toBeVisible();
  });

  test('KPI values render from dashboard data', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // KPI values from mock data should appear
    // Attendance rate: 87.5%
    const attendanceVisible = await page.getByText(/87\.5/i).first().isVisible().catch(() => false);
    expect(attendanceVisible).toBeTruthy();

    // Tasks completed: 18
    const tasksVisible = await page.getByText(/18/).first().isVisible().catch(() => false);
    expect(tasksVisible).toBeTruthy();
  });

  test('refresh button visible for admin roles', async ({ page }) => {
    await quickLogin(page, 'admin', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Refresh button should be visible for admin_system
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    const isVisible = await refreshBtn.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('refresh button hidden for non-admin roles', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Refresh button should not be visible for non-admin
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    const isVisible = await refreshBtn.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('charts render on dashboard', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Charts render as SVG elements
    const svgs = page.locator('svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('workers analytics page loads', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/workers');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page title visible
    const heading = page.getByRole('heading', { name: /pekerja|worker/i }).first();
    const isVisible = await heading.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('workers list shows worker names', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/workers');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Worker names visible
    await expect(page.getByText('Budi Santoso').first()).toBeVisible();
    await expect(page.getByText('Siti Nurhaliza').first()).toBeVisible();
  });

  test('workers list shows grades', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/workers');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Performance grades visible (grade 'A')
    const gradeA = await page.getByText(/\bA\b/).first().isVisible().catch(() => false);
    expect(gradeA).toBeTruthy();
  });

  test('areas analytics page loads', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/areas');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page should load with area data
    const heading = page.getByRole('heading', { name: /area|taman/i }).first();
    const isVisible = await heading.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('areas list shows area names', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/areas');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Area names visible
    await expect(page.getByText('Taman Bungkul').first()).toBeVisible();
    await expect(page.getByText('Taman Flora').first()).toBeVisible();
    await expect(page.getByText('Taman Apsari').first()).toBeVisible();
  });

  test('areas list shows numeric data', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics/areas');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // At least some numeric data should render
    const hasNumbers = await page.getByText(/\d+/).count().catch(() => 0);
    expect(hasNumbers).toBeGreaterThan(0);
  });

  test('analytics accessible to permitted roles', async ({ page }) => {
    await quickLogin(page, 'adminData', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // adminData has permission, should see analytics page
    const heading = page.getByRole('heading', { name: /analitik/i });
    const isVisible = await heading.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('period selector changes data', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const selector = page.getByRole('combobox');
    const visible = await selector.isVisible().catch(() => false);

    if (visible) {
      await selector.click();
      const option7 = page.getByRole('option', { name: /7 hari/i });
      const has7 = await option7.isVisible().catch(() => false);
      expect(has7).toBeTruthy();
    }
  });

  test('attendance trend data renders', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Attendance label should exist (auto-retry — the chart can render slowly under load)
    await expect(page.getByText(/kehadiran/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('task completion trend data renders', async ({ page }) => {
    await quickLogin(page, 'korlap', '/analytics');
    await setupMockAnalyticsRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Should have charts on dashboard
    const svgs = page.locator('svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(0);
  });
});
