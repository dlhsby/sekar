import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

// The Jadwal page was redesigned (ADR-047): the weekly-grid-with-table-toggle is
// gone, replaced by a single range select (Tahun/Bulan/Minggu/Hari, default Hari)
// over a Rayon▸Kawasan▸Lokasi day coverage board, with create as a modal.
test.describe('SCH-1 schedules calendar', () => {
  test('defaults to the day view with a date nav', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    // Range select defaults to Hari (day).
    await expect(page.getByRole('combobox', { name: /rentang/i })).toContainText(/hari/i);
    // Compact date nav exposes a "Hari ini" (today) button.
    await expect(page.getByRole('button', { name: /^hari ini$/i })).toBeVisible();
  });

  test('switches the range view via the select', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await page.getByRole('combobox', { name: /rentang/i }).click();
    await page.getByRole('option', { name: /^minggu$/i }).click();
    await expect(page.getByRole('combobox', { name: /rentang/i })).toContainText(/minggu/i);
  });

  test('opens the create-schedule modal (recurrence form)', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await page.getByRole('button', { name: /buat jadwal/i }).click();
    // Create is now a dialog, not a /schedules/new route.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/pengulangan/i).first()).toBeVisible();
  });

  test('create modal lists schedulable workers by name (not undefined)', async ({ page }) => {
    await quickLogin(page, 'admin', '/schedules');
    await page.getByRole('button', { name: /buat jadwal/i }).click();
    // Open the "Pekerja" combobox inside the modal.
    await page.getByRole('combobox', { name: /Pekerja/i }).click();
    // Schedulable satgas/linmas appear with their real full_name; never "undefined".
    await expect(page.getByRole('option', { name: /Satgas Lapangan \(satgas1\)/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /undefined/i })).toHaveCount(0);
    // Non-schedulable roles (e.g. admin) must be filtered out.
    await expect(page.getByRole('option', { name: /Admin Sistem/i })).toHaveCount(0);
  });
});
