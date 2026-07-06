/**
 * Monitoring page E2E (Phase 4-9 B1) — map shell, worker list/detail, area
 * capacity tab, and the Phase 4-4 bulk-reassign flow (mocked API).
 * Route overrides are registered after quickLogin/setupMockApi — Playwright
 * uses the most-recently-added matching handler.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const RAYON_ID = 'aaaaaaaa-0000-4000-8000-00000000000a';
const AREA_BUNGKUL = 'aaaaaaaa-0000-4000-8000-0000000000b1';
const AREA_FLORA = 'aaaaaaaa-0000-4000-8000-0000000000b2';

const SNAPSHOT = {
  success: true,
  data: {
    workers: [
      {
        user_id: 'aaaaaaaa-0000-4000-8000-0000000000c1',
        full_name: 'Budi Santoso',
        role: 'satgas',
        status: 'active',
        lat: -7.2915,
        lng: 112.7395,
        area_id: AREA_BUNGKUL,
        area_name: 'Taman Bungkul',
        rayon_id: RAYON_ID,
        rayon_name: 'Rayon Selatan',
        battery_level: 80,
        is_within_area: true,
        last_update: '2026-06-10T08:00:00.000Z',
      },
      {
        user_id: 'aaaaaaaa-0000-4000-8000-0000000000c2',
        full_name: 'Siti Rahayu',
        role: 'linmas',
        status: 'inactive',
        lat: -7.2992,
        lng: 112.749,
        area_id: AREA_FLORA,
        area_name: 'Taman Flora',
        rayon_id: RAYON_ID,
        rayon_name: 'Rayon Selatan',
        battery_level: 15,
        is_within_area: true,
        last_update: '2026-06-10T08:00:00.000Z',
      },
    ],
    area_summaries: [
      {
        area_id: AREA_BUNGKUL,
        area_name: 'Taman Bungkul',
        rayon_id: RAYON_ID,
        rayon_name: 'Rayon Selatan',
        active_count: 1,
        required_count: 3,
        is_understaffed: true,
      },
      {
        area_id: AREA_FLORA,
        area_name: 'Taman Flora',
        rayon_id: RAYON_ID,
        rayon_name: 'Rayon Selatan',
        active_count: 1,
        required_count: 1,
        is_understaffed: false,
      },
    ],
    total_active: 1,
    total_inactive: 1,
    total_outside_area: 0,
    total_missing: 0,
    total_offline: 0,
    generated_at: '2026-06-10T08:00:00.000Z',
  },
};

const BOUNDARIES = {
  generated_at: '2026-06-10T08:00:00.000Z',
  rayons: [
    {
      id: RAYON_ID,
      name: 'Rayon Selatan',
      boundary_polygon: null,
      center_lat: -7.29,
      center_lng: 112.74,
      area_count: 2,
      is_understaffed: true,
      understaffed_area_count: 1,
      areas: [
        {
          id: AREA_BUNGKUL,
          name: 'Taman Bungkul',
          boundary_polygon: null,
          center_lat: -7.2915,
          center_lng: 112.7395,
          rayon_id: RAYON_ID,
          rayon_name: 'Rayon Selatan',
          radius_meters: 100,
          assigned_count: 1,
          is_understaffed: true,
          staffing_summary: [],
        },
        {
          id: AREA_FLORA,
          name: 'Taman Flora',
          boundary_polygon: null,
          center_lat: -7.2992,
          center_lng: 112.749,
          rayon_id: RAYON_ID,
          rayon_name: 'Rayon Selatan',
          radius_meters: 120,
          assigned_count: 1,
          is_understaffed: false,
          staffing_summary: [],
        },
      ],
    },
  ],
};

const LIVE_USERS = {
  total_active: 1,
  total_inactive: 0,
  total_outside_area: 0,
  total_missing: 0,
  total_offline: 0,
  users: [
    {
      id: 'aaaaaaaa-0000-4000-8000-0000000000c2',
      full_name: 'Siti Rahayu',
      role: 'linmas',
      status: 'inactive',
      area_id: AREA_FLORA,
      area_name: 'Taman Flora',
      rayon_id: RAYON_ID,
      rayon_name: 'Rayon Selatan',
      latitude: -7.2992,
      longitude: 112.749,
      battery_level: 15,
      last_update: '2026-06-10T08:00:00.000Z',
      is_within_area: true,
    },
    {
      id: 'aaaaaaaa-0000-4000-8000-0000000000c3',
      full_name: 'Joko Susilo',
      role: 'satgas',
      status: 'active',
      area_id: AREA_FLORA,
      area_name: 'Taman Flora',
      rayon_id: RAYON_ID,
      rayon_name: 'Rayon Selatan',
      latitude: -7.2992,
      longitude: 112.749,
      battery_level: 70,
      last_update: '2026-06-10T08:00:00.000Z',
      is_within_area: true,
    },
  ],
  generated_at: '2026-06-10T08:00:00.000Z',
};

async function openMonitoring(page: Page, role: 'admin' | 'korlap' = 'admin') {
  await quickLogin(page, role, '/monitoring');
  await page.route('**/api/v1/monitoring/snapshot**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SNAPSHOT) })
  );
  await page.route('**/api/v1/monitoring/boundaries**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(BOUNDARIES),
    })
  );
  await page.route('**/api/v1/monitoring/live-users**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(LIVE_USERS),
    })
  );
  await page.reload();
  await expect(page.getByPlaceholder('Cari petugas…')).toBeVisible({ timeout: 10000 });
}

test.describe('Monitoring page', () => {
  test('renders search, status pills and worker count', async ({ page }) => {
    await openMonitoring(page);
    await expect(page.getByText(/^Aktif/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /daftar petugas/i })).toBeVisible();
  });

  test('lists workers and opens the inline detail card', async ({ page }) => {
    await openMonitoring(page);
    await page.getByRole('button', { name: /daftar petugas/i }).click();
    await expect(page.getByText('Budi Santoso')).toBeVisible();

    await page.getByText('Budi Santoso').click();
    await expect(page.getByText(/kembali ke daftar/i)).toBeVisible();
    await expect(page.getByText(/dalam area/i)).toBeVisible();
  });

  test('area tab shows capacity indicators and understaffed badge', async ({ page }) => {
    await openMonitoring(page);
    await page.getByRole('button', { name: /daftar petugas/i }).click();
    await page.getByRole('tab', { name: /area/i }).click();

    await expect(page.getByText('Taman Bungkul')).toBeVisible();
    await expect(page.getByText('1/3')).toBeVisible();
    await expect(page.getByText(/kurang 2/i)).toBeVisible();
  });

  test('bulk reassign: select 2 workers → 2 reassign calls → success toast', async ({ page }) => {
    await openMonitoring(page);

    const reassignCalls: unknown[] = [];
    await page.route('**/api/v1/monitoring/reassign', async (route: Route) => {
      reassignCalls.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.getByRole('button', { name: /daftar petugas/i }).click();
    await page.getByRole('tab', { name: /area/i }).click();
    await page.getByLabel('Pindah massal petugas ke Taman Bungkul').click();

    await expect(page.getByRole('heading', { name: /pindah massal ke taman bungkul/i })).toBeVisible();
    await page.getByLabel(/area asal/i).selectOption(AREA_FLORA);
    await expect(page.getByText('Siti Rahayu')).toBeVisible();

    await page.getByRole('button', { name: /pilih semua/i }).click();
    await page.getByRole('button', { name: /pindahkan 2 petugas/i }).click();

    await expect(page.getByText(/2 petugas berhasil dipindahkan/i)).toBeVisible();
    expect(reassignCalls).toHaveLength(2);
    expect(reassignCalls[0]).toMatchObject({ target_area_id: AREA_BUNGKUL });
  });

  test('korlap does not see the bulk-reassign trigger', async ({ page }) => {
    await openMonitoring(page, 'korlap');
    await page.getByRole('button', { name: /daftar petugas/i }).click();
    await page.getByRole('tab', { name: /area/i }).click();

    await expect(page.getByText('Taman Bungkul')).toBeVisible();
    await expect(page.getByRole('button', { name: /pindah massal/i })).toHaveCount(0);
  });
});
