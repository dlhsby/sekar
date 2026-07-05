/**
 * Visual regression guard (Phase 3 close-out, minimal scope per plan).
 *
 * Screenshots login + dashboard home at the three layout breakpoints
 * (mobile 375 / tablet 768 / desktop 1280) against committed baselines.
 * Dynamic regions (relative timestamps in the notification feed) are
 * masked so the baselines stay stable. Mocked API only — deterministic
 * data comes from e2e/fixtures/mock-api.ts.
 *
 * Regenerate baselines after an intentional design change:
 *   SKIP_SERVER=1 npx playwright test 15-visreg --project=chromium --update-snapshots
 */
import { test, expect, Page } from '@playwright/test';
import { quickLogin } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const SCREENSHOT_OPTS = {
  fullPage: true,
  animations: 'disabled' as const,
  // Small tolerance for font antialiasing differences between runs.
  maxDiffPixelRatio: 0.02,
};

/** Mask everything that renders relative-to-now text. */
function dynamicMasks(page: Page) {
  return [page.locator('time'), page.getByText(/lalu$/)];
}

test.describe('Visual regression (login + dashboard home)', () => {
  for (const vp of VIEWPORTS) {
    test(`login page @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupMockApi(page, 'admin');
      await page.goto('/login');
      await page.waitForSelector('input[name="identifier"]');
      await expect(page).toHaveScreenshot(`login-${vp.name}.png`, SCREENSHOT_OPTS);
    });

    test(`dashboard home @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await quickLogin(page, 'admin', '/');
      await page.waitForSelector('main');
      await expect(page).toHaveScreenshot(`dashboard-${vp.name}.png`, {
        ...SCREENSHOT_OPTS,
        mask: dynamicMasks(page),
      });
    });
  }
});
