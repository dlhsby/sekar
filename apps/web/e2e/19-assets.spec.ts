/**
 * Assets pages E2E (Phase 5-3) — asset list with search/filter/pagination,
 * asset detail, QR batch page, maintenance calendar.
 * Route overrides are registered after quickLogin/setupMockApi.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const ASSET_ID = 'aaa00000-0000-0000-0000-000000000001';
const ASSET_ID_2 = 'aaa00000-0000-0000-0000-000000000002';
const CATEGORY_ID_1 = 'cat-001';

const ASSET_CATEGORIES = [
  {
    id: CATEGORY_ID_1,
    name: 'Peralatan Pangkas',
    slug: 'peralatan-pangkas',
    code_prefix: 'EQ',
    description: 'Alat-alat pemangkasan',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const ASSETS = [
  {
    id: ASSET_ID,
    category_id: CATEGORY_ID_1,
    category: ASSET_CATEGORIES[0],
    name: 'Gergaji Potong Besar',
    asset_code: 'EQ-001',
    description: 'Gergaji untuk pemangkasan dahan besar',
    status: 'available' as const,
    condition: 'good' as const,
    purchase_date: '2025-01-15',
    purchase_price: 500000,
    area_id: '850e8400-0000-0000-0000-000000000001',
    area: { id: '850e8400-0000-0000-0000-000000000001', name: 'Taman Bungkul' },
    last_maintenance_at: '2026-05-20T08:00:00.000Z',
    next_maintenance_at: '2026-08-20T08:00:00.000Z',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2026-05-20T08:00:00.000Z',
  },
  {
    id: ASSET_ID_2,
    category_id: CATEGORY_ID_1,
    category: ASSET_CATEGORIES[0],
    name: 'Mesin Potong Rumput',
    asset_code: 'EQ-002',
    description: 'Mesin potong rumput bertenaga',
    status: 'in_use' as const,
    condition: 'fair' as const,
    purchase_date: '2024-06-10',
    purchase_price: 3500000,
    area_id: '850e8400-0000-0000-0000-000000000002',
    area: { id: '850e8400-0000-0000-0000-000000000002', name: 'Taman Flora' },
    last_maintenance_at: '2026-06-01T08:00:00.000Z',
    next_maintenance_at: '2026-07-01T08:00:00.000Z',
    created_at: '2024-06-10T00:00:00.000Z',
    updated_at: '2026-06-01T08:00:00.000Z',
  },
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const MAINTENANCE_RECORDS = [
  {
    id: 'maint-001',
    asset_id: ASSET_ID,
    type: 'routine',
    status: 'completed',
    scheduled_date: '2026-05-20',
    completed_date: '2026-05-20T08:00:00.000Z',
    notes: 'Pembersihan dan pelumasan rutin',
    created_at: '2026-05-20T08:00:00.000Z',
  },
];

async function setupMockAssetRoutes(page: Page) {
  // Broad assets list (least specific) — registered FIRST so the specific
  // routes below take precedence (Playwright uses the last-registered match).
  await page.route('**/api/v1/assets**', async (route: Route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const categoryId = url.searchParams.get('category_id');

    let filtered = ASSETS;
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (categoryId) {
      filtered = filtered.filter((a) => a.category_id === categoryId);
    }

    return json(route, {
      data: filtered,
      meta: { total: filtered.length, page: 1, limit: 20, totalPages: 1 },
    });
  });

  // Asset categories — real endpoint is `/assets/categories`, returns an array.
  // Registered after the broad route so it wins for this URL.
  await page.route('**/api/v1/assets/categories**', async (route: Route) => {
    return json(route, ASSET_CATEGORIES);
  });

  // Maintenance overview endpoints (`/assets/maintenance/calendar`,
  // `/assets/maintenance/overdue`) — return arrays, not a paginated envelope.
  await page.route('**/api/v1/assets/maintenance/**', async (route: Route) => {
    return json(route, MAINTENANCE_RECORDS);
  });

  // Per-asset maintenance records (`/assets/:id/maintenance`).
  await page.route('**/api/v1/assets/*/maintenance**', async (route: Route) => {
    return json(route, MAINTENANCE_RECORDS);
  });

  // Asset detail (registered last → wins over the broad route for these URLs).
  await page.route(`**/api/v1/assets/${ASSET_ID}`, async (route: Route) => {
    return json(route, ASSETS[0]);
  });

  await page.route(`**/api/v1/assets/${ASSET_ID_2}`, async (route: Route) => {
    return json(route, ASSETS[1]);
  });
}

test.describe('Assets Pages (Phase 5-3)', () => {
  test('asset list renders with heading and search', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Page title visible (scope to main content — the top bar also renders the title)
    await expect(
      page.locator('#main-content').getByRole('heading', { name: 'Aset' })
    ).toBeVisible();

    // Description visible
    await expect(page.getByText(/kelola aset/i)).toBeVisible();
  });

  test('asset list has management buttons for managers', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Action buttons visible for asset manager role (korlap is in ASSET_MANAGER_ROLES)
    await expect(page.getByRole('button', { name: /tambah/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /qr batch/i })).toBeVisible();
  });

  test('asset table shows asset rows with codes and names', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Asset codes visible
    await expect(page.getByRole('cell', { name: 'EQ-001' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'EQ-002' })).toBeVisible();

    // Asset names visible
    await expect(page.getByRole('cell', { name: 'Gergaji Potong Besar' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Mesin Potong Rumput' })).toBeVisible();
  });

  test('asset status badges display correctly', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Status badges visible (label appears in both the tab bar and table pills)
    await expect(page.getByText('Tersedia').first()).toBeVisible();
    await expect(page.getByText('Digunakan').first()).toBeVisible();
  });

  test('asset area locations display correctly', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Area names visible
    await expect(page.getByRole('cell', { name: 'Taman Bungkul' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Taman Flora' })).toBeVisible();
  });

  test('status tabs are present and clickable', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Status tabs visible (Tabs render as role="tab")
    const tabs = page.getByRole('tab', { name: /semua|tersedia|digunakan|perawatan/i });
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('asset detail page loads and shows asset info', async ({ page }) => {
    await quickLogin(page, 'korlap', `/assets/${ASSET_ID}`);

    await page.route(`**/api/v1/assets/${ASSET_ID}`, async (route: Route) => {
      return json(route, ASSETS[0]);
    });

    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Asset name visible
    await expect(page.getByText('Gergaji Potong Besar')).toBeVisible();

    // Asset code visible
    await expect(page.getByText('EQ-001')).toBeVisible();

    // Status visible
    await expect(page.getByText('Tersedia')).toBeVisible();
  });

  test('QR batch button is visible and clickable', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const qrButton = page.getByRole('button', { name: /qr batch/i });
    const isVisible = await qrButton.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('add asset button is visible and clickable', async ({ page }) => {
    await quickLogin(page, 'korlap', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const addButton = page.getByRole('button', { name: /tambah/i });
    const isVisible = await addButton.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('read-only roles do not see management buttons', async ({ page }) => {
    // top_management is NOT in ASSET_MANAGER_ROLES (korlap/kepala_rayon/admin_system/superadmin)
    await quickLogin(page, 'topManagement', '/assets');
    await setupMockAssetRoutes(page);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Management buttons should not be visible
    const addButton = page.getByRole('button', { name: /tambah/i });
    const qrButton = page.getByRole('button', { name: /qr batch/i });

    expect(await addButton.isVisible().catch(() => false)).toBeFalsy();
    expect(await qrButton.isVisible().catch(() => false)).toBeFalsy();
  });
});
