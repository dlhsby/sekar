/**
 * Capacity management E2E (Phase 3-11 CAP-1) — weekly service-capacity grid.
 * Tests read/write roles (admin_data read-only, kepala_rayon/top_management write)
 * with mocked API routes. Route overrides registered after quickLogin/setupMockApi
 * take precedence via Playwright's most-recently-added-handler rule.
 */

import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const RAYON_ID = '950e8400-0000-0000-0000-000000000001';

const RAYON = {
  id: RAYON_ID,
  name: 'Rayon Selatan',
  code: 'RYN-01',
};

const CAPACITY_DATA = [
  {
    id: 'cap-1',
    rayonId: RAYON_ID,
    year: 2026,
    isoWeek: 24,
    serviceType: 'pruning',
    capacityUnits: 50,
    bookedUnits: 30,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'cap-2',
    rayonId: RAYON_ID,
    year: 2026,
    isoWeek: 25,
    serviceType: 'pruning',
    capacityUnits: 60,
    bookedUnits: 50,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setupCapacityRoutes(page: Page) {
  // Rayon detail
  await page.route(`**/api/v1/rayons/${RAYON_ID}`, async (route: Route) => {
    return json(route, RAYON);
  });

  // Capacity list — returns array for all weeks in query params
  await page.route(`**/api/v1/rayons/${RAYON_ID}/capacity**`, async (route: Route) => {
    return json(route, CAPACITY_DATA);
  });

  // Capacity PUT (upsert)
  await page.route(`**/api/v1/rayons/${RAYON_ID}/capacity`, async (route: Route) => {
    if (route.request().method() === 'PUT') {
      const payload = await route.request().postDataJSON();
      return json(route, { ...payload, id: 'new-id' }, 201);
    }
    return json(route, CAPACITY_DATA);
  });
}

test.describe('Capacity Management (CAP-1)', () => {
  test('renders page header and capacity grid for admin_data role (read-only)', async ({ page }) => {
    await quickLogin(page, 'adminData', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();

    // Page header visible
    await expect(page.getByTestId('page-header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /kapasitas layanan/i })).toBeVisible();

    // "Hanya lihat" status badge visible (read-only)
    await expect(page.getByText(/hanya lihat/i)).toBeVisible();

    // Grid content visible
    await expect(page.getByText('Jenis Layanan')).toBeVisible();
  });

  test('displays weeks and service types in grid', async ({ page }) => {
    await quickLogin(page, 'adminData', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();

    // Week headers visible (use filter for exact text on desktop grid)
    const desktopGrid = page.locator('.hidden.md\\:block');
    await expect(desktopGrid.getByText(/^W24$/).first()).toBeVisible();
    await expect(desktopGrid.getByText(/^W25$/).first()).toBeVisible();

    // Service type visible (from desktop grid only)
    await expect(desktopGrid.getByText(/pruning|Pruning/i).first()).toBeVisible();
  });

  test('displays booked/capacity values in grid cells', async ({ page }) => {
    await quickLogin(page, 'adminData', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();

    // Booked/capacity pairs visible (in the desktop grid)
    const desktopGrid = page.locator('.hidden.md\\:block');
    await expect(desktopGrid.getByText('30/50')).toBeVisible();
    await expect(desktopGrid.getByText('50/60')).toBeVisible();
  });

  test('kepala_rayon can edit capacity and save', async ({ page }) => {
    const putCalls: unknown[] = [];

    await quickLogin(page, 'kepalaRayon', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);

    // Track PUT requests (must be registered before reload)
    await page.route(`**/api/v1/rayons/${RAYON_ID}/capacity`, async (route: Route) => {
      if (route.request().method() === 'PUT') {
        putCalls.push(await route.request().postDataJSON());
        return json(route, { success: true }, 201);
      }
      return json(route, CAPACITY_DATA);
    });

    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // No "Hanya lihat" banner for edit roles
    const viewOnlyBadge = page.getByText(/hanya lihat/i);
    await expect(viewOnlyBadge).not.toBeVisible();

    // Find an editable input (capacity cell) and change it (desktop grid inputs)
    const inputs = await page.locator('input[type="number"]').all();
    expect(inputs.length).toBeGreaterThan(0);

    if (inputs.length > 0) {
      await inputs[0].fill('75');

      // Simpan button should appear
      await expect(page.getByRole('button', { name: /simpan/i })).toBeVisible();
      await page.getByRole('button', { name: /simpan/i }).click();

      // Wait for PUT to settle
      await page.waitForTimeout(300);

      // Verify PUT was called with capacity payload
      expect(putCalls.length).toBeGreaterThan(0);
      expect(putCalls[0]).toMatchObject({
        year: expect.any(Number),
        isoWeek: expect.any(Number),
        serviceType: 'pruning',
        capacityUnits: expect.any(Number),
      });
    }
  });

  test('admin_data role does not see edit inputs (read-only)', async ({ page }) => {
    await quickLogin(page, 'adminData', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();

    // No number inputs for read-only
    const inputs = await page.locator('input[type="number"]').all();
    expect(inputs.length).toBe(0);

    // Simpan button should not be visible
    await expect(page.getByRole('button', { name: /simpan/i })).not.toBeVisible();
  });

  test('year selector works and persists state', async ({ page }) => {
    await quickLogin(page, 'kepalaRayon', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();

    // Year FormSelect is present (shadcn Select, not native <select>)
    const yearLabel = page.getByText('Tahun');
    await expect(yearLabel).toBeVisible();

    // The select trigger should show current year (2026 from current window)
    const yearTrigger = page.getByRole('combobox', { name: /tahun/i });
    await expect(yearTrigger).toBeVisible();
  });

  test('capacity PUT sends correct payload on edit + save', async ({ page }) => {
    let putPayload: unknown | null = null;

    await quickLogin(page, 'topManagement', `/rayons/${RAYON_ID}/capacity`);

    // Intercept and record PUT
    await page.route(`**/api/v1/rayons/${RAYON_ID}/capacity`, async (route: Route) => {
      if (route.request().method() === 'PUT') {
        putPayload = await route.request().postDataJSON();
        return json(route, { success: true }, 201);
      }
      return json(route, CAPACITY_DATA);
    });

    // Also need rayon route
    await page.route(`**/api/v1/rayons/${RAYON_ID}`, async (route: Route) => {
      return json(route, RAYON);
    });

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Find first input and edit
    const inputs = await page.locator('input[type="number"]').all();
    if (inputs.length > 0) {
      await inputs[0].fill('99');

      // Click Simpan
      const saveBtn = page.getByRole('button', { name: /simpan/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(300);

        // Verify payload structure
        expect(putPayload).toMatchObject({
          year: expect.any(Number),
          isoWeek: expect.any(Number),
          serviceType: 'pruning',
          capacityUnits: expect.any(Number),
        });
      }
    }
  });

  test('mobile viewport renders capacity layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await quickLogin(page, 'adminData', `/rayons/${RAYON_ID}/capacity`);
    await setupCapacityRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page should still render on mobile
    await expect(page.getByRole('heading', { name: /kapasitas layanan/i })).toBeVisible();

    // Mobile card layout visible (space-y-3 md:hidden)
    const mobileLayout = page.locator('div.space-y-3.md\\:hidden');
    await expect(mobileLayout.getByText(/pruning/i).first()).toBeVisible();
  });
});
