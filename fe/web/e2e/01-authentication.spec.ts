/**
 * E2E Tests: Authentication Flow
 * Tests login, logout, and protected route access
 */

import { test, expect } from '@playwright/test';
import { login, logout, testUsers } from './auth.setup';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
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

    // Fill login form
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify dashboard loaded
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator(`text=${testUsers.admin.expectedName}`)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with wrong credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
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
    // Login
    await login(page, testUsers.admin);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator(`text=${testUsers.admin.expectedName}`)).toBeVisible();
  });

  test('should handle concurrent sessions', async ({ page, context }) => {
    // Login in first tab
    await login(page, testUsers.admin);

    // Open new tab and check if already logged in
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');

    // Should be logged in (shared cookies)
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.locator(`text=${testUsers.admin.expectedName}`)).toBeVisible();

    await newPage.close();
  });
});

test.describe('Role-Based Access Control', () => {
  test('Admin should access all routes', async ({ page }) => {
    await login(page, testUsers.admin);

    const adminRoutes = [
      '/dashboard',
      '/users',
      '/areas',
      '/rayons',
      '/schedules',
      '/reports',
      '/tasks',
      '/monitoring',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
      // Should not redirect to dashboard (unauthorized)
      await expect(page).not.toHaveURL('/dashboard');
    }
  });

  test('Worker should not access admin routes', async ({ page }) => {
    await login(page, testUsers.worker);

    // Try to access admin-only route
    await page.goto('/users');

    // Should redirect to dashboard (unauthorized)
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('KoordinatorLapangan should access assigned routes', async ({ page }) => {
    await login(page, testUsers.koordinator);

    const allowedRoutes = ['/dashboard', '/schedules', '/reports', '/tasks'];

    for (const route of allowedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
    }

    // Should not access admin-only routes
    await page.goto('/users');
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });
});
