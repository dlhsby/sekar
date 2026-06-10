import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('TSK-1 tasks kanban/table', () => {
  test('defaults to the kanban board with the four lanes', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await expect(page.getByRole('region', { name: /belum mulai/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /sedang dikerjakan/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /^selesai$/i })).toBeVisible();
    // A task card is present.
    await expect(page.getByText('Pemangkasan Taman Bungkul').first()).toBeVisible();
  });

  test('toggles to the table view', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await page.getByRole('tab', { name: /tabel/i }).click();
    await expect(page.getByText('Judul Tugas')).toBeVisible();
    await expect(page.getByRole('link', { name: /detail/i }).first()).toBeVisible();
  });

  test('opens the create-task form', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await page.getByRole('button', { name: /buat tugas/i }).click();
    await expect(page).toHaveURL(/\/tasks\/new/);
  });
});
