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

  test('worker dropdown lists schedulable workers by name (not undefined)', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules/new');
    // Open the "Pekerja" select (Radix combobox).
    await page.getByRole('combobox', { name: /Pekerja/i }).click();
    // Schedulable satgas/linmas appear with their real full_name; never "undefined".
    await expect(page.getByRole('option', { name: /Satgas Lapangan \(satgas1\)/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Linmas Keamanan \(linmas1\)/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /undefined/i })).toHaveCount(0);
    // Non-schedulable roles (e.g. admin) must be filtered out.
    await expect(page.getByRole('option', { name: /Admin Sistem/i })).toHaveCount(0);
  });
});
