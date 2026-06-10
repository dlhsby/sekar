import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('SCH-1 schedules weekly grid', () => {
  test('defaults to the weekly grid with day headers', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await expect(page.getByRole('tab', { name: /grid mingguan/i })).toBeVisible();
    // Day-of-week headers (desktop matrix).
    await expect(page.getByText('SEN').first()).toBeVisible();
    await expect(page.getByText('MIN').first()).toBeVisible();
  });

  test('navigates between weeks and toggles to the table', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await page.getByRole('button', { name: /minggu berikutnya/i }).click();
    await page.getByRole('tab', { name: /^tabel$/i }).click();
    await expect(page.getByText('Pekerja').first()).toBeVisible();
  });

  test('opens the create-schedule form', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await page.getByRole('button', { name: /buat jadwal/i }).click();
    await expect(page).toHaveURL(/\/schedules\/new/);
    await expect(page.getByRole('heading', { name: /buat jadwal baru/i })).toBeVisible();
  });
});
