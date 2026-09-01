import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('TSK-1 tasks kanban/table', () => {
  test('defaults to the kanban board with the four lanes', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await expect(page.getByRole('region', { name: /belum mulai/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /sedang dikerjakan/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /^selesai$/i })).toBeVisible();
    // A task card is present.
    await expect(page.getByText('Perantingan Taman Bungkul').first()).toBeVisible();
  });

  test('toggles to the table view', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await page.getByRole('tab', { name: /tabel/i }).click();
    await expect(page.getByText('Judul Tugas').first()).toBeVisible();
    // Row actions now live in a standardized "..." kebab menu.
    await page.getByRole('button', { name: 'Aksi' }).first().click();
    await expect(page.getByRole('menuitem', { name: /lihat/i })).toBeVisible();
  });

  test('opens the create-task modal', async ({ page }) => {
    await quickLogin(page, 'admin', '/tasks');
    await page.getByRole('button', { name: /buat tugas/i }).click();
    // "Buat Tugas" now opens a full-size modal instead of navigating to /tasks/new.
    await expect(page.getByRole('heading', { name: /tambah tugas/i })).toBeVisible();
  });
});
