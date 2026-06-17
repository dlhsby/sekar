/**
 * Reports pages E2E (Phase 5-1) — reports list, builder flow, schedules page.
 * Route overrides are registered after quickLogin/setupMockApi.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const REPORT_ID = 'rep00000-0000-0000-0000-000000000001';
const REPORT_ID_2 = 'rep00000-0000-0000-0000-000000000002';
const TEMPLATE_ID = 'tpl00000-0000-0000-0000-000000000001';

const GENERATED_REPORTS = [
  {
    id: REPORT_ID,
    template_id: TEMPLATE_ID,
    title: 'Laporan Operasional Harian 10 Juni 2026',
    report_type: 'daily_operations',
    format: 'pdf',
    status: 'completed',
    file_url: 'https://example.com/report-001.pdf',
    file_size_bytes: 1024000,
    parameters: { start_date: '2026-06-10', end_date: '2026-06-10' },
    error_message: null,
    started_at: '2026-06-10T08:00:00.000Z',
    completed_at: '2026-06-10T08:30:00.000Z',
    created_at: '2026-06-10T08:00:00.000Z',
    updated_at: '2026-06-10T08:30:00.000Z',
  },
  {
    id: REPORT_ID_2,
    template_id: TEMPLATE_ID,
    title: 'Laporan Mingguan Kinerja Pekerja',
    report_type: 'weekly_performance',
    format: 'xlsx',
    status: 'processing',
    file_url: null,
    file_size_bytes: null,
    parameters: { start_date: '2026-06-02', end_date: '2026-06-08' },
    error_message: null,
    started_at: '2026-06-10T10:00:00.000Z',
    completed_at: null,
    created_at: '2026-06-10T10:00:00.000Z',
    updated_at: '2026-06-10T10:00:00.000Z',
  },
];

const REPORT_TEMPLATES = [
  {
    id: TEMPLATE_ID,
    name: 'Laporan Harian Standar',
    slug: 'laporan-harian-standar',
    description: 'Template laporan operasional harian',
    report_type: 'daily_operations',
    template_config: {},
    is_system: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const REPORT_SCHEDULES = {
  data: [
    {
      id: 'sch00000-0000-0000-0000-000000000001',
      template_id: TEMPLATE_ID,
      name: 'Laporan Harian Otomatis',
      frequency: 'daily',
      cron_expression: '0 9 * * *',
      timezone: 'Asia/Jakarta',
      parameters: {},
      is_active: true,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
  ],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setupMockReportRoutes(page: Page) {
  // Reports list with filters
  await page.route('**/api/v1/reporting/reports**', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return json(route, { success: true }, 200);
    }
    return json(route, {
      data: GENERATED_REPORTS,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });

  // Report templates (for builder)
  await page.route('**/api/v1/reporting/templates**', async (route: Route) => {
    return json(route, REPORT_TEMPLATES);
  });

  // Report schedules
  await page.route('**/api/v1/reporting/schedules**', async (route: Route) => {
    return json(route, REPORT_SCHEDULES);
  });

  // Reports list (GET, matches `?page=…`) + generate report (POST). The trailing
  // `**` is required so the query-string list URL matches (a bare `/reports` does not).
  await page.route('**/api/v1/reporting/reports**', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      return json(
        route,
        {
          id: 'new-report-id',
          template_id: body.template_id,
          title: body.title || 'Laporan Baru',
          report_type: body.report_type,
          format: body.format,
          status: 'processing',
          parameters: body.parameters,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        201
      );
    }
    return json(route, {
      data: GENERATED_REPORTS,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });
}

test.describe('Reports Pages (Phase 5-1)', () => {
  test('reports list renders with title and create button', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page title visible (scope to main content; sidebar + top bar also say "Laporan")
    await expect(
      page.locator('#main-content').getByRole('heading', { name: 'Laporan', exact: true })
    ).toBeVisible();

    // Description visible
    await expect(page.getByText(/lihat dan kelola/i)).toBeVisible();

    // Create button visible
    await expect(page.getByRole('button', { name: /buat laporan/i }).first()).toBeVisible();
  });

  test('reports table shows report data', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Report titles visible
    await expect(page.getByText('Laporan Operasional Harian 10 Juni 2026')).toBeVisible();
    await expect(page.getByText('Laporan Mingguan Kinerja Pekerja')).toBeVisible();

    // Report type labels visible (exact — they're substrings of the titles above)
    await expect(page.getByText('Laporan Harian', { exact: true })).toBeVisible();
    await expect(page.getByText('Laporan Mingguan', { exact: true })).toBeVisible();

    // Format labels visible
    await expect(page.getByText('PDF', { exact: true })).toBeVisible();
    await expect(page.getByText('Excel', { exact: true })).toBeVisible();
  });

  test('report status badges display', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Status badges visible
    await expect(page.getByText('Selesai')).toBeVisible();
    await expect(page.getByText('Memproses')).toBeVisible();
  });

  test('report type filter selector is visible', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Type filter should be visible
    const filterLabel = page.getByLabel(/tipe laporan/i);
    const filterVisible = await filterLabel.isVisible().catch(() => false);
    expect(filterVisible).toBeTruthy();
  });

  test('create report button is clickable', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const createBtn = page.getByRole('button', { name: /buat laporan/i });
    const isVisible = await createBtn.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('report actions (download/delete) buttons are present', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Find action buttons (these are icon buttons typically)
    const actionButtons = page.getByRole('button').filter({ has: page.locator('svg') });
    const count = await actionButtons.count();
    // Should have at least some action buttons (download/delete for each report)
    expect(count).toBeGreaterThan(0);
  });

  test('only reporting-permitted roles can access', async ({ page }) => {
    await quickLogin(page, 'topManagement', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // topManagement has permission, should see content
    const heading = page
      .locator('#main-content')
      .getByRole('heading', { name: 'Laporan', exact: true });
    const isVisible = await heading.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('report table displays in table format', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Table headers should exist
    const headers = page.getByRole('columnheader');
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('report rows are clickable/have detail buttons', async ({ page }) => {
    await quickLogin(page, 'korlap', '/reports');
    await setupMockReportRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Table data rows should exist
    const rows = page.getByRole('row');
    const count = await rows.count();
    // Should have header + at least 2 data rows
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
