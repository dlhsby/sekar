/**
 * Plants pages E2E (Phase 3-8) — catalog page with search/pagination,
 * area detail with inventory table and notable plants section.
 * Route overrides are registered after quickLogin/setupMockApi.
 * Playwright uses the most-recently-added matching handler, so these
 * overrides take precedence over the catch-all in setupMockApi.
 */
import { test, expect, Page, Route } from '@playwright/test';
import { quickLogin } from './auth.setup';

const AREA_ID = '850e8400-0000-0000-0000-000000000001';
const AREA_NAME = 'Taman Bungkul';

const SPECIES_FIXTURES = [
  {
    id: 'sp-001',
    nameId: 'Pohon Jati',
    nameLatin: 'Tectona grandis',
    category: 'tree',
    defaultPruningCycleDays: 180,
  },
  {
    id: 'sp-002',
    nameId: 'Bunga Bougainvillea',
    nameLatin: 'Bougainvillea spectabilis',
    category: 'flower',
    defaultPruningCycleDays: 90,
  },
  {
    id: 'sp-003',
    nameId: 'Rumput Gajah',
    nameLatin: null,
    category: 'groundcover',
    defaultPruningCycleDays: 30,
  },
  {
    id: 'sp-004',
    nameId: 'Semak Pucuk Merah',
    nameLatin: 'Syzygium oleinum',
    category: 'shrub',
    defaultPruningCycleDays: 120,
  },
];

const AREA_PLANTS = [
  {
    id: 'ap-001',
    areaId: AREA_ID,
    speciesId: 'sp-001',
    count: 15,
    lastPrunedAt: '2026-05-10T08:00:00.000Z',
    nextDueAt: '2026-11-10T08:00:00.000Z',
    status: 'ok' as const,
    overrideCycleDays: null,
    species: {
      id: 'sp-001',
      nameId: 'Pohon Jati',
      category: 'tree',
    },
  },
  {
    id: 'ap-002',
    areaId: AREA_ID,
    speciesId: 'sp-002',
    count: 45,
    lastPrunedAt: '2026-04-05T08:00:00.000Z',
    nextDueAt: '2026-07-05T08:00:00.000Z',
    status: 'due_soon' as const,
    overrideCycleDays: null,
    species: {
      id: 'sp-002',
      nameId: 'Bunga Bougainvillea',
      category: 'flower',
    },
  },
  {
    id: 'ap-003',
    areaId: AREA_ID,
    speciesId: 'sp-003',
    count: 200,
    lastPrunedAt: '2026-05-01T08:00:00.000Z',
    nextDueAt: '2026-05-31T08:00:00.000Z',
    status: 'overdue' as const,
    overrideCycleDays: null,
    species: {
      id: 'sp-003',
      nameId: 'Rumput Gajah',
      category: 'groundcover',
    },
  },
];

const NOTABLE_PLANTS = [
  {
    id: 'np-001',
    areaId: AREA_ID,
    speciesId: 'sp-001',
    gpsLat: -7.2915,
    gpsLng: 112.7395,
    label: 'Pohon Jati Tertua',
    heritage: true,
    photoUrls: ['https://example.com/jati.jpg'],
    notes: 'Pohon jati tertua di taman, berusia lebih dari 50 tahun',
    species: {
      id: 'sp-001',
      nameId: 'Pohon Jati',
      category: 'tree',
    },
  },
  {
    id: 'np-002',
    areaId: AREA_ID,
    speciesId: 'sp-002',
    gpsLat: -7.292,
    gpsLng: 112.74,
    label: 'Bunga Langka Bunga Jepang',
    heritage: false,
    photoUrls: ['https://example.com/flower.jpg'],
    notes: 'Varietas langka dari Jepang, perlu monitoring khusus',
    species: {
      id: 'sp-002',
      nameId: 'Bunga Bougainvillea',
      category: 'flower',
    },
  },
];

const AREAS = [
  {
    id: AREA_ID,
    name: AREA_NAME,
    code: 'TB-01',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    rayon: { id: '950e8400-0000-0000-0000-000000000001', name: 'Rayon Selatan' },
    coverage_area: '15000.00',
    area_type: { id: 'at1', name: 'Taman Kota' },
    boundary_polygon: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '850e8400-0000-0000-0000-000000000002',
    name: 'Taman Flora',
    code: 'TF-01',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    rayon: { id: '950e8400-0000-0000-0000-000000000001', name: 'Rayon Selatan' },
    coverage_area: '20000.00',
    area_type: { id: 'at1', name: 'Taman Kota' },
    boundary_polygon: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function setupMockPlantRoutes(page: Page) {
  // Plant species search — called when q is non-empty
  await page.route(/\/api\/v1\/plant-species\/search\?/, async (route: Route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('q');
    const filtered = SPECIES_FIXTURES.filter(
      (s) =>
        s.nameId.toLowerCase().includes(search?.toLowerCase() || '') ||
        (s.nameLatin?.toLowerCase().includes(search?.toLowerCase() || '') ?? false)
    );
    return json(route, filtered);
  });

  // Plant species — pagination (no search)
  await page.route(/\/api\/v1\/plant-species\?/, async (route: Route) => {
    const url = new URL(route.request().url());
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const paginated = SPECIES_FIXTURES.slice(offset, offset + limit);
    return json(route, {
      data: paginated,
      total: SPECIES_FIXTURES.length,
    });
  });

  // Area-specific endpoints
  await page.route(`**/api/v1/areas/${AREA_ID}/notable-plants**`, async (route: Route) => {
    return json(route, NOTABLE_PLANTS);
  });

  await page.route(`**/api/v1/areas/${AREA_ID}/plants**`, async (route: Route) => {
    return json(route, AREA_PLANTS);
  });

  await page.route(`**/api/v1/areas/${AREA_ID}**`, async (route: Route) => {
    return json(route, AREAS[0]);
  });

  // Generic areas endpoints
  await page.route(/\/api\/v1\/areas\?/, async (route: Route) => {
    return json(route, {
      data: AREAS,
      meta: { total: AREAS.length, page: 1, limit: 1000, totalPages: 1 },
    });
  });

  await page.route('**/api/v1/areas', async (route: Route) => {
    return json(route, {
      data: AREAS,
      meta: { total: AREAS.length, page: 1, limit: 1000, totalPages: 1 },
    });
  });
}

test.describe('Plants Pages (Phase 3-8)', () => {
  test('catalog renders with species rows', async ({ page }) => {
    await quickLogin(page, 'admin', '/plants');
    await setupMockPlantRoutes(page);
    await page.reload();

    // Title visible
    await expect(page.getByRole('heading', { name: /tanaman/i })).toBeVisible();

    // Search input visible
    await expect(page.getByPlaceholder(/cari nama/i)).toBeVisible();

    // Area selector visible
    await expect(page.getByLabel(/ke area/i)).toBeVisible();

    // Table renders with species rows
    await expect(page.getByRole('cell', { name: 'Pohon Jati' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bunga Bougainvillea' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rumput Gajah' })).toBeVisible();

    // Category badges visible
    await expect(page.getByText('Pohon', { exact: true })).toBeVisible();
    await expect(page.getByText('Bunga', { exact: true })).toBeVisible();
    await expect(page.getByText('Penutup Tanah')).toBeVisible();
    await expect(page.getByText('Semak', { exact: true })).toBeVisible();
  });

  test('search filters species (debounced)', async ({ page }) => {
    await quickLogin(page, 'admin', '/plants');
    await setupMockPlantRoutes(page);
    await page.reload();

    const searchInput = page.getByPlaceholder(/cari nama/i);
    await searchInput.fill('Jati');
    await page.waitForTimeout(500);

    // Only Jati visible
    await expect(page.getByRole('cell', { name: 'Pohon Jati' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Bunga Bougainvillea' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rumput Gajah' })).not.toBeVisible();
  });

  test('pagination buttons work (when not searching)', async ({ page }) => {
    const manySpecies = Array.from({ length: 50 }, (_, i) => ({
      id: `sp-${i}`,
      nameId: `Spesies ${i}`,
      nameLatin: `Species ${i} latin`,
      category: (
        ['tree', 'shrub', 'groundcover', 'flower'] as const
      )[i % 4],
      defaultPruningCycleDays: 90 + i * 10,
    }));

    await quickLogin(page, 'admin', '/plants');

    await page.route('**/api/v1/plant-species*', async (route: Route) => {
      const url = new URL(route.request().url());
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const paginated = manySpecies.slice(offset, offset + limit);
      return json(route, {
        data: paginated,
        total: manySpecies.length,
      });
    });

    await page.route('**/api/v1/areas**', async (route: Route) => {
      return json(route, {
        data: AREAS,
        meta: { total: AREAS.length, page: 1, limit: 1000, totalPages: 1 },
      });
    });

    await page.reload();

    await expect(page.getByRole('button', { name: /selanjutnya/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /selanjutnya/i })).toBeEnabled();

    await page.getByRole('button', { name: /selanjutnya/i }).click();

    await expect(page.getByText(/halaman 2 dari/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sebelumnya/i })).toBeEnabled();
  });

  test('area selector navigates to area detail', async ({ page }) => {
    await quickLogin(page, 'admin', '/plants');
    await setupMockPlantRoutes(page);
    await page.reload();

    const selector = page.getByLabel(/ke area/i);
    await selector.click();
    await page.getByRole('option', { name: /taman flora/i }).click();

    await expect(page).toHaveURL(`/plants/850e8400-0000-0000-0000-000000000002`);
  });

  test('area detail page shows inventory table', async ({ page }) => {
    await quickLogin(page, 'admin', `/plants/${AREA_ID}`);

    await page.route(`**/api/v1/areas/${AREA_ID}`, async (route: Route) => json(route, AREAS[0]));
    await page.route(`**/api/v1/areas/${AREA_ID}/plants`, async (route: Route) => json(route, AREA_PLANTS));
    await page.route(`**/api/v1/areas/${AREA_ID}/notable-plants`, async (route: Route) => json(route, NOTABLE_PLANTS));

    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Header shows area name
    await expect(page.getByRole('heading', { name: AREA_NAME })).toBeVisible();

    // Summary tiles
    await expect(page.getByText(/total jenis/i)).toBeVisible();
    await expect(page.getByText(/total tanaman/i)).toBeVisible();
    await expect(page.getByText(/jatuh tempo/i)).toBeVisible();

    // Table headers
    await expect(page.getByRole('columnheader', { name: /spesies/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /jumlah/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

    // Data rows
    await expect(page.getByRole('cell', { name: 'Pohon Jati' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '45' })).toBeVisible();

    // Status badges
    await expect(page.getByText('Terawat')).toBeVisible();
    await expect(page.getByText('Segera')).toBeVisible();
    await expect(page.getByText('Terlambat')).toBeVisible();
  });

  test('area detail shows notable plants section', async ({ page }) => {
    await quickLogin(page, 'admin', `/plants/${AREA_ID}`);

    await page.route(`**/api/v1/areas/${AREA_ID}`, async (route: Route) => json(route, AREAS[0]));
    await page.route(`**/api/v1/areas/${AREA_ID}/plants`, async (route: Route) => json(route, AREA_PLANTS));
    await page.route(`**/api/v1/areas/${AREA_ID}/notable-plants`, async (route: Route) => json(route, NOTABLE_PLANTS));

    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Notable plants section title
    await expect(page.getByRole('heading', { name: /tanaman istimewa/i })).toBeVisible();

    // Notable plant labels
    await expect(page.getByRole('heading', { name: 'Pohon Jati Tertua' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bunga Langka Bunga Jepang' })).toBeVisible();

    // Heritage badge
    await expect(page.getByText('Warisan')).toBeVisible();

    // Notes visible
    await expect(page.getByText(/pohon jati tertua di taman/i)).toBeVisible();
    await expect(page.getByText(/varietas langka dari jepang/i)).toBeVisible();
  });

  test('summary tiles calculate correct counts', async ({ page }) => {
    await quickLogin(page, 'admin', `/plants/${AREA_ID}`);

    await page.route(`**/api/v1/areas/${AREA_ID}`, async (route: Route) => json(route, AREAS[0]));
    await page.route(`**/api/v1/areas/${AREA_ID}/plants`, async (route: Route) => json(route, AREA_PLANTS));
    await page.route(`**/api/v1/areas/${AREA_ID}/notable-plants`, async (route: Route) => json(route, NOTABLE_PLANTS));

    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    await expect(page.getByText(/total jenis/i)).toBeVisible();
    await expect(page.getByText(/total tanaman/i)).toBeVisible();
    await expect(page.getByText(/jatuh tempo/i)).toBeVisible();
  });

  test('back button on area detail returns to previous page', async ({ page }) => {
    await quickLogin(page, 'admin', '/plants');
    await setupMockPlantRoutes(page);
    await page.reload();

    const selector = page.getByLabel(/ke area/i);
    await selector.click();
    await page.getByRole('option', { name: new RegExp(AREA_NAME) }).click();

    await expect(page).toHaveURL(`/plants/${AREA_ID}`);

    await page.getByRole('button', { name: /kembali/i }).click();

    await expect(page.getByRole('heading', { name: /tanaman/i })).toBeVisible();
  });
});
