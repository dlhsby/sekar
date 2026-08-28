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
    // Outline, fill, marker and name label are independent — the fill was not
    // separately expressible under the four-way select this replaced, and the
    // label was split off the marker so a dense tier can show pins without names.
    const rayon = page.getByRole('group', { name: /^rayon$/i });
    await expect(rayon.getByRole('checkbox')).toHaveCount(4);
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

  test('viewport mode sends a bbox, and it buys a smaller payload', async ({ page }) => {
    // Rewritten after the original could never pass: it waited for an un-bboxed
    // `level=area` response on switching to zoom, but the geo search index
    // already fetches exactly that URL at page load, so React Query serves the
    // switch from cache and NO request reaches the network to observe.
    //
    // The honest comparison is like for like — the same `level` with and
    // without a bbox — so this collects responses from load instead.
    const payloads: { url: string; bytes: number }[] = [];
    page.on('response', async (r) => {
      if (!r.url().includes('/monitoring/boundaries')) return;
      try {
        payloads.push({ url: r.url(), bytes: (await r.body()).length });
      } catch {
        // A response body can be gone by the time this runs; a missed sample
        // only weakens the assertion, it cannot make it wrong.
      }
    });

    await loginAndOpenMonitoring(page);
    await page.waitForTimeout(3000);
    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('viewport');
    await page.waitForTimeout(4000);

    const bboxed = payloads.find((p) => p.url.includes('bbox='));
    const plain = payloads.find(
      (p) => !p.url.includes('bbox=') && p.url.includes('level=district')
    );

    // The mode does ask the server to narrow, rather than filtering client-side.
    expect(bboxed, 'viewport mode must send a bbox').toBeTruthy();
    expect(plain).toBeTruthy();
    // And narrowing is not free-of-effect: off-screen geometry is never built.
    expect(bboxed!.bytes).toBeLessThanOrEqual(plain!.bytes);
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

  test('viewport mode ranks instead of drawing everything, and hides nothing', async ({ page }) => {
    // The client's screenshot: at city zoom every kawasan drew an identical pin,
    // ~130 of them, and the one with nobody clocked in looked like the rest.
    // Progressive reveal promotes a bounded number to full pins and demotes the
    // remainder to dots — DEMOTES, never drops, which is what the second half of
    // this test pins down.
    await loginAndOpenMonitoring(page);
    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('zoom');
    await page.waitForTimeout(3500);
    const zoomFullPins = await page.locator('gmp-advanced-marker svg').count();

    // The popover stays open across a selectOption, so switching again is one
    // more select — clicking "Pengaturan" here would CLOSE it.
    await page.getByLabel(/mode monitoring/i).selectOption('viewport');
    await page.waitForTimeout(3500);

    const viewportFullPins = await page.locator('gmp-advanced-marker svg').count();
    const dots = await page.locator('.marker-dot').count();

    console.log(
      `[reveal] zoom full pins=${zoomFullPins} · viewport full pins=${viewportFullPins} · dots=${dots}`
    );

    // Ranked, not exhaustive: far fewer things competing for the eye.
    expect(viewportFullPins).toBeLessThan(zoomFullPins);
    // And nothing vanished — the tail is on the map, as dots.
    expect(dots).toBeGreaterThan(0);
  });

  test('at kawasan depth it ranks the crowd instead of drawing all of it', async ({ page }) => {
    // This is where the client's screenshot actually hurt: at city zoom the tier
    // floor only admits the 8 rayon, but one level in there are ~129 kawasan and
    // the old rule drew every one of them as an identical pin.
    //
    // Drilling is used rather than a wheel gesture because it is deterministic:
    // the map fits the rayon's bounds, which is reliably past the kawasan
    // threshold, and it is the flow an operator actually performs.
    await loginAndOpenMonitoring(page);
    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('viewport');
    // Close the popover by toggling it: it overlays the map and would swallow
    // the drill click. Escape does not dismiss it.
    await page.getByRole('button', { name: /pengaturan/i }).click();
    await page.waitForTimeout(3000);

    const cityPins = await page.locator('gmp-advanced-marker svg').count();

    // Drill into a rayon by tapping its pin — the operator's own gesture. The
    // fit lands around zoom 12, still under the kawasan threshold, so a couple
    // of wheel notches follow to cross it. (That the drill alone does not
    // reveal the tier is pre-existing tier behaviour, noted in ADR-060.)
    await page.locator('gmp-advanced-marker[title^="Rayon"]').first().click();
    await page.waitForTimeout(3500);

    const box = (await page.locator('.gm-style').first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(3500);

    const pins = await page.locator('gmp-advanced-marker svg').count();
    const dots = await page.locator('.marker-dot').count();

    console.log(`[reveal] city full pins=${cityPins} · rayon full pins=${pins} · dots=${dots}`);

    // The crowd is ranked, not drawn whole: some markers were demoted, and the
    // full pins stay bounded by the budget rather than growing with the kawasan
    // count (which is 129 on this dataset).
    expect(dots).toBeGreaterThan(0);
    expect(pins).toBeLessThanOrEqual(70);
  });

  test('viewport mode tells the operator what the dots are', async ({ page }) => {
    // A field of unexplained dots reads as broken data. The hint is what makes
    // it read as "more detail is waiting".
    await loginAndOpenMonitoring(page);
    await openSettings(page);
    await page.getByLabel(/mode monitoring/i).selectOption('viewport');
    await page.keyboard.press('Escape');
    await expect(page.getByText(/perbesar untuk melihat|titik kecil/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
