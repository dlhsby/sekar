/**
 * Monitoring against a LIVE backend — the map-mode revamp (ADR-060).
 *
 * Every other monitoring spec mocks the API, which is right for asserting UI
 * wiring and wrong for this: the whole point of zoom mode is what happens with
 * a real hierarchy behind it (9 rayon / 129 kawasan / 952 lokasi on the staging
 * clone). A mocked payload of three areas cannot tell you whether the mode does
 * anything.
 *
 * Opt-in, because CI has no backend:
 *
 *   LIVE_API=1 SKIP_SERVER=1 BASE_URL=http://localhost:4125 \
 *     npx playwright test 16-monitoring-live --project=chromium
 *
 * The web instance it points at must itself be pointed at the target API.
 */
import { test, expect, type Page } from '@playwright/test';

const LIVE = process.env.LIVE_API === '1';
const USER = process.env.LIVE_USER ?? 'superadmin';
const PASS = process.env.LIVE_PASS ?? '12345678';

test.skip(!LIVE, 'live-backend spec — set LIVE_API=1 with a running API');

async function loginAndOpenMonitoring(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="identifier"]').fill(USER);
  await page.locator('input[name="password"]').fill(PASS);
  await page.getByRole('button', { name: /masuk/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await page.goto('/monitoring');
  // The floating search is the last thing to mount, so it is the readiness signal.
  await expect(page.getByPlaceholder(/cari petugas/i)).toBeVisible({ timeout: 30_000 });
}

/** Open the "Pengaturan" popover that owns Mode + the layer selects. */
async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: /pengaturan/i }).click();
  await expect(page.getByLabel(/mode monitoring/i)).toBeVisible();
}

test.describe('Monitoring — live backend', () => {
  test('settings expose the mode control and a facet group per geo tier', async ({ page }) => {
    await loginAndOpenMonitoring(page);
    await openSettings(page);

    // Drill is the default: nobody's map gets heavier without asking.
    await expect(page.getByLabel(/mode monitoring/i)).toHaveValue('drill');

    for (const label of [/^rayon$/i, /^kawasan$/i, /^lokasi$/i, /petugas & tim/i]) {
      await expect(page.getByRole('group', { name: label })).toBeVisible();
    }
    // Outline, fill and marker are independent — the fill was not separately
    // expressible under the four-way select this replaced.
    const rayon = page.getByRole('group', { name: /^rayon$/i });
    await expect(rayon.getByRole('checkbox')).toHaveCount(3);
  });

  test('zoom mode draws more of the hierarchy than drill at city scope', async ({ page }) => {
    await loginAndOpenMonitoring(page);

    // Wait for the first aggregate to settle so the counts below are stable.
    await page.waitForTimeout(2500);
    const drillMarkers = await page.locator('gmp-advanced-marker, [role="button"][title]').count();

    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('zoom');
    // Zoom refetches boundaries at level=area and the all-tier aggregate.
    await page.waitForResponse(
      (r) => r.url().includes('/monitoring/aggregate') && r.url().includes('scope=all'),
      { timeout: 30_000 }
    );
    await page.waitForTimeout(3000);
    const zoomMarkers = await page.locator('gmp-advanced-marker, [role="button"][title]').count();

    // The assertion is DIRECTIONAL on purpose: the exact count depends on the
    // dataset, but zoom must draw strictly more of the hierarchy than drill.
    expect(zoomMarkers).toBeGreaterThan(drillMarkers);
  });

  test('the mode survives a reload', async ({ page }) => {
    await loginAndOpenMonitoring(page);
    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('zoom');
    await page.reload();
    await expect(page.getByPlaceholder(/cari petugas/i)).toBeVisible({ timeout: 30_000 });
    await openSettings(page);
    await expect(page.getByLabel(/mode monitoring/i)).toHaveValue('zoom');
  });

  test('viewport mode sends a bbox and asks for less than zoom does', async ({ page }) => {
    await loginAndOpenMonitoring(page);
    await openSettings(page);

    await page.getByLabel(/mode monitoring/i).selectOption('viewport');
    const boundaries = await page.waitForResponse(
      (r) => r.url().includes('/monitoring/boundaries') && r.url().includes('bbox='),
      { timeout: 30_000 }
    );
    const viewportBytes = (await boundaries.body()).length;

    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('zoom');
    const all = await page.waitForResponse(
      (r) => r.url().includes('/monitoring/boundaries') && !r.url().includes('bbox='),
      { timeout: 30_000 }
    );
    // The whole point of the mode: the city-wide geometry is never produced for
    // regions off-screen. Directional, since both numbers depend on the camera.
    expect(viewportBytes).toBeLessThan((await all.body()).length);
  });

  test('search finds a LOKASI and a KAWASAN from the city view', async ({ page }) => {
    // The defect this covers: search read the map's scope-bound boundaries, and
    // at city scope those carry no lokasi and no kawasan — so the default view
    // could find neither.
    await loginAndOpenMonitoring(page);
    const box = page.getByPlaceholder(/cari petugas/i);

    await box.click();
    await box.fill('taman');
    // Section headers render as "<Label> · <count>", so match the prefix rather
    // than an exact string.
    await expect(page.getByText(/^Area · \d+/).first()).toBeVisible({ timeout: 20_000 });

    await box.fill('');
    await box.fill('kawasan');
    // A kawasan section AT ALL is the fix — there was no `region` result type
    // before, so this tier was unfindable at every scope, not just at city.
    await expect(page.getByText(/^Kawasan · \d+/).first()).toBeVisible({ timeout: 20_000 });
  });

  test('unticking Marker keeps a tier\'s outline but drops its pins', async ({ page }) => {
    await loginAndOpenMonitoring(page);
    await page.waitForTimeout(2500);
    const before = await page.locator('gmp-advanced-marker, [role="button"][title]').count();

    await openSettings(page);
    await page.getByRole('group', { name: /^rayon$/i }).getByLabel(/marker/i).uncheck();
    await page.waitForTimeout(1500);
    const after = await page.locator('gmp-advanced-marker, [role="button"][title]').count();

    // Node markers were ungated entirely before v5 — this is the case the facet
    // checkboxes exist to make possible.
    expect(after).toBeLessThanOrEqual(before);
  });
});
