import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('People & places', () => {
  test('USR-1 users list renders rows', async ({ page }) => {
    await quickLogin(page, 'admin', '/users');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByText('Admin Sistem').first()).toBeVisible();
  });

  test('areas list renders without the formatArea crash', async ({ page }) => {
    // Regression: coverage_area arrives as a numeric string ("15000.00").
    await quickLogin(page, 'admin', '/areas');
    await expect(page).toHaveURL(/\/areas/);
    await expect(page.getByText('Taman Bungkul').first()).toBeVisible();
    await expect(page.getByText(/terjadi kesalahan/i)).toHaveCount(0);
  });

  test('RAY-1 rayon detail renders (heading + areas search)', async ({ page }) => {
    await quickLogin(page, 'admin', '/rayons/950e8400-0000-0000-0000-000000000001');
    await expect(page.getByRole('heading', { name: /rayon selatan/i })).toBeVisible();
    await expect(page.getByText(/cari area/i)).toBeVisible();
  });
});
