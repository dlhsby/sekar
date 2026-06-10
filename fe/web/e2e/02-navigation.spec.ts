import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('Navigation & dashboard chrome', () => {
  test('renders the grouped sidebar and header masthead', async ({ page }) => {
    await quickLogin(page, 'admin');
    // Sidebar groups (Phase 4-R regroup).
    await expect(page.getByText('Pekerjaan', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Data Master', { exact: false }).first()).toBeVisible();
    // Header masthead breadcrumb eyebrow.
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible();
  });

  test('navigates to Tugas via the sidebar', async ({ page }) => {
    await quickLogin(page, 'admin');
    // 'Pekerjaan' is a collapsible group — expand it, then click the Tugas leaf.
    const pekerjaan = page.getByRole('button', { name: /pekerjaan/i }).first();
    if (await pekerjaan.isVisible().catch(() => false)) await pekerjaan.click();
    await page.getByRole('link', { name: /^Tugas$/ }).first().click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('toggles dark mode from the header', async ({ page }) => {
    await quickLogin(page, 'admin');
    const toggle = page.getByRole('button', { name: /mode gelap|mode terang/i });
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
