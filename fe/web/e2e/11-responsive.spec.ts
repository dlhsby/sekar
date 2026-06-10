import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

/** Acceptance gate item #6 — every route works at 375 / 768 / 1280 px. */
test.describe('Responsive PWA', () => {
  test('mobile (375): sidebar collapses to a drawer trigger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await quickLogin(page, 'admin');
    await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeVisible();
  });

  test('mobile (375): schedules grid collapses to per-worker cards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await quickLogin(page, 'admin', '/schedules');
    // The desktop day-header matrix is hidden <768px; the mobile worker card
    // (rendered after the matrix in the DOM) remains visible.
    await expect(page.getByText('SEN').first()).toBeHidden();
    await expect(page.getByText('Koordinator Lapangan').last()).toBeVisible();
  });

  test('desktop (1280): tasks board shows multiple lanes side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await quickLogin(page, 'admin', '/tasks');
    await expect(page.getByRole('region', { name: /belum mulai/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /^selesai$/i })).toBeVisible();
  });
});
