import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('SET-1 settings', () => {
  test('renders the three tabs scoped to backed surfaces', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await expect(page.getByRole('tab', { name: /umum/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /keamanan/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /notifikasi/i })).toBeVisible();
  });

  test('Umum shows identity + a dark-mode switch', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await expect(page.getByText('Admin Sistem').first()).toBeVisible();
    await expect(page.getByRole('switch', { name: /mode gelap/i })).toBeVisible();
  });

  test('Keamanan exposes the change-password form', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await page.getByRole('tab', { name: /keamanan/i }).click();
    await expect(page.getByLabel(/kata sandi saat ini/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /simpan kata sandi/i })).toBeVisible();
  });

  test('Notifikasi lists per-type toggles', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await page.getByRole('tab', { name: /notifikasi/i }).click();
    await expect(page.getByText(/tugas baru ditugaskan/i)).toBeVisible();
  });
});
