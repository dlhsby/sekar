import { test, expect } from '@playwright/test';
import { login, logout, quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Authentication', () => {
  test('shows the login form', async ({ page }) => {
    await setupMockApi(page, 'admin');
    await page.goto('/login');
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
  });

  test('logs in and lands on the dashboard home', async ({ page }) => {
    await login(page, testUsers.admin);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByLabel('User menu')).toBeVisible();
  });

  test('links to the forgot-password page', async ({ page }) => {
    await setupMockApi(page, 'admin');
    await page.goto('/login');
    await page.getByRole('link', { name: /lupa sandi/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole('link', { name: /kembali/i })).toBeVisible();
  });

  test('logs out via the user menu', async ({ page }) => {
    await quickLogin(page, 'admin');
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});
