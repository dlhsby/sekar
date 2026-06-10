import { test, expect } from '@playwright/test';
import { login, quickLogin, testUsers } from './auth.setup';

test.describe('smoke', () => {
  test('login lands on the dashboard home', async ({ page }) => {
    await login(page, testUsers.admin);
    await expect(page).toHaveURL(/\/$|\/$/);
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toBeVisible();
  });

  test('quickLogin renders the dashboard via cookies', async ({ page }) => {
    await quickLogin(page, 'admin');
    await expect(page.getByLabel('User menu')).toBeVisible();
  });
});
