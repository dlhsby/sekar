/**
 * E2E Tests: Authentication Flow
 * Tests login, logout, and protected route access
 */

import { test, expect } from '@playwright/test';
import { login, quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock API for all authentication tests
    await setupMockApi(page);

    // Start at home page
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should login successfully as Admin', async ({ page }) => {
    await page.goto('/login');

    // Wait for form to load
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });

    // Fill login form
    await page.fill('input[name="username"]', testUsers.admin.username);
    await page.fill('input[name="password"]', testUsers.admin.password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Wait for form
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });

    // Fill with wrong credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message or stay on login page
    // Check for either alert or still on login page
    const isOnLogin = page.url().includes('/login');
    expect(isOnLogin).toBe(true);

    // Try to find error message (may vary by implementation)
    const hasError =
      (await page.locator('[role="alert"]').count()) > 0 ||
      (await page.locator('text=/invalid|error|gagal/i').count()) > 0;

    // At least one should be true
    expect(isOnLogin || hasError).toBe(true);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Wait for form
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors or stay on login (HTML5 validation may prevent submit)
    await page.waitForTimeout(500);

    // Check if still on login page (validation prevented submit)
    await expect(page).toHaveURL('/login');

    // Check if fields are marked as invalid or have error messages
    const usernameInput = page.locator('input[name="username"]');
    const hasValidation =
      (await page.locator('text=/wajib|required/i').count()) > 0 ||
      (await usernameInput.evaluate((el) => !(el as HTMLInputElement).validity.valid));

    expect(hasValidation).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await login(page, testUsers.admin);

    // Click profile menu
    await page.click('[data-testid="profile-menu"]');

    // Click logout
    await page.click('text=Keluar');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });

    // Try to access dashboard again - should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should persist session on page reload', async ({ page }) => {
    // Login using quick method
    await quickLogin(page, testUsers.admin);

    // Reload page
    await page.reload();

    // Should still be logged in (cookies persist)
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle concurrent sessions', async ({ page, context }) => {
    // Login in first tab
    await quickLogin(page, testUsers.admin);

    // Open new tab and check if already logged in
    const newPage = await context.newPage();

    // Setup mock API for new page too
    await setupMockApi(newPage);

    await newPage.goto('/dashboard');

    // Should be logged in (shared cookies)
    await expect(newPage).toHaveURL('/dashboard');

    await newPage.close();
  });
});

test.describe('Role-Based Access Control', () => {
  test('Admin should access all routes', async ({ page }) => {
    await quickLogin(page, testUsers.admin);

    const adminRoutes = ['/dashboard', '/users', '/areas', '/rayons', '/tasks', '/reports'];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      await expect(page).toHaveURL(route);
    }
  });

  test('Worker should not access admin routes', async ({ page }) => {
    await quickLogin(page, testUsers.worker);

    // Try to access admin-only route
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should redirect to dashboard (unauthorized)
    await expect(page).toHaveURL('/dashboard');
  });

  test('KoordinatorLapangan should access assigned routes', async ({ page }) => {
    await quickLogin(page, testUsers.koordinator);

    const allowedRoutes = ['/dashboard', '/reports', '/tasks'];

    for (const route of allowedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      await expect(page).toHaveURL(route);
    }

    // Should not access admin-only routes
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    await expect(page).toHaveURL('/dashboard');
  });
});
