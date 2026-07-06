import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('KEC-1 kecamatan submit', () => {
  test('renders the submit form for staff_kecamatan', async ({ page }) => {
    await quickLogin(page, 'staffKecamatan', '/pruning-submit');
    await expect(page.getByRole('heading', { name: /kirim permintaan/i })).toBeVisible();
    await expect(page.getByLabel(/alamat/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /gunakan lokasi saya/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tambah foto/i })).toBeVisible();
  });

  test('blocks an empty submission with a validation warning', async ({ page }) => {
    await quickLogin(page, 'staffKecamatan', '/pruning-submit');
    await page.getByRole('button', { name: /kirim permohonan/i }).click();
    await expect(page.getByText(/alamat minimal 5 karakter/i)).toBeVisible();
    await expect(page.getByText(/lampirkan minimal 1 foto/i)).toBeVisible();
  });

  test('lists own requests on the My Requests page', async ({ page }) => {
    await quickLogin(page, 'staffKecamatan', '/pruning-submit/my');
    await expect(page.getByRole('heading', { name: /permintaan saya/i })).toBeVisible();
    await expect(page.getByText('PR-2026-001').first()).toBeVisible();
  });
});
