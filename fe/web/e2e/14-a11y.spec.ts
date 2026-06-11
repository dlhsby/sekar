/**
 * Accessibility automation (Phase 4-9 / testing.md §0) — axe-core WCAG 2.1 A/AA
 * scan over the revamped pages (mocked API). Gate: zero serious/critical
 * violations; moderate/minor are reported in the failure message when the
 * gate trips but do not fail the suite on their own.
 */
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { quickLogin } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    // Mapbox renders an inaccessible <canvas> we don't control
    .exclude('.mapboxgl-map')
    .analyze();

  const gating = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  const summary = gating
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
    .join('\n');
  expect(gating, `WCAG AA violations:\n${summary}`).toEqual([]);
}

test.describe('Accessibility (WCAG 2.1 AA, axe-core)', () => {
  test('login page', async ({ page }) => {
    await setupMockApi(page, 'admin');
    await page.goto('/login');
    await page.waitForSelector('input[name="identifier"]');
    await expectNoSeriousViolations(page);
  });

  test('forgot-password page', async ({ page }) => {
    await setupMockApi(page, 'admin');
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await expectNoSeriousViolations(page);
  });

  const DASHBOARD_PAGES: { name: string; path: string }[] = [
    { name: 'dashboard home', path: '/' },
    { name: 'tasks', path: '/tasks' },
    { name: 'schedules', path: '/schedules' },
    { name: 'overtime', path: '/overtime' },
    { name: 'activities', path: '/activities' },
    { name: 'users', path: '/users' },
    { name: 'areas', path: '/areas' },
    { name: 'rayons', path: '/rayons' },
    { name: 'pruning requests', path: '/pruning-requests' },
    { name: 'notifications', path: '/notifications' },
    { name: 'settings', path: '/settings' },
    { name: 'profile', path: '/profile' },
    { name: 'monitoring', path: '/monitoring' },
    { name: 'plants', path: '/plants' },
    { name: 'seeds', path: '/seeds' },
    // Mock fixture's fixed RAYON id (e2e/fixtures/mock-api.ts)
    {
      name: 'rayon capacity',
      path: '/rayons/950e8400-0000-0000-0000-000000000001/capacity',
    },
  ];

  for (const { name, path } of DASHBOARD_PAGES) {
    test(`${name} page`, async ({ page }) => {
      await quickLogin(page, 'admin', path);
      await expectNoSeriousViolations(page);
    });
  }
});
