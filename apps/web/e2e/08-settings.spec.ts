import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('SET-1 settings', () => {
  test('renders the two areas (Pribadi + Sistem)', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await expect(page.getByRole('tab', { name: /pribadi/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sistem/i })).toBeVisible();
  });

  test('Pribadi is a master/detail with identity + appearance groups', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    // Identity group is selected first → identity + edit-profile link.
    await expect(page.getByText('Admin Sistem').first()).toBeVisible();
    // Appearance group → staged Light/Dark segmented control.
    await page.getByRole('button', { name: /tampilan/i }).first().click();
    await expect(page.getByRole('radio', { name: /gelap/i })).toBeVisible();
  });

  test('Pribadi has a Save/Reset action bar that reacts to staged changes', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await page.getByRole('button', { name: /tampilan/i }).first().click();
    // Staging a theme flips the bar from "no changes" to enabled Save/Reset.
    await page.getByRole('radio', { name: /gelap/i }).click();
    await expect(page.getByRole('button', { name: /simpan perubahan/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /reset perubahan/i })).toBeEnabled();
  });

  test('Notifikasi group lists per-type toggles', async ({ page }) => {
    await quickLogin(page, 'admin', '/settings');
    await page.getByRole('button', { name: /notifikasi/i }).first().click();
    await expect(page.getByText(/tugas baru ditugaskan/i)).toBeVisible();
  });
});
