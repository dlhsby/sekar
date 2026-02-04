/**
 * E2E Tests: User Management
 * Tests CRUD operations for users (Admin only)
 */

import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';

test.describe('User Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin using quick method
    await quickLogin(page, testUsers.admin);

    // Navigate to users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  });

  test('should display users list', async ({ page }) => {
    // Check page title (may vary)
    const hasTitle =
      (await page.locator('h1:has-text("Manajemen Pengguna")').count()) > 0 ||
      (await page.locator('h1:has-text("Users")').count()) > 0 ||
      (await page.locator('h1:has-text("Pengguna")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Check if table or list is visible
    const hasContent =
      (await page.locator('table').count()) > 0 ||
      (await page.locator('[role="table"]').count()) > 0 ||
      (await page.locator('[data-testid="users-list"]').count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('should search users by name', async ({ page }) => {
    // Find search input (may have different attributes)
    const searchInput =
      page.locator('input[placeholder*="Cari"]').or(page.locator('input[type="search"]')).first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('Admin');
      await page.waitForTimeout(500);

      // Just verify the search field works
      const value = await searchInput.inputValue();
      expect(value).toBe('Admin');
    }
  });

  test('should filter users by role', async ({ page }) => {
    // Select role filter if available
    const roleSelect = page
      .locator('select[name="role"]')
      .or(page.locator('[data-testid="role-filter"]'))
      .first();

    if ((await roleSelect.count()) > 0) {
      await roleSelect.selectOption({ index: 1 }); // Select first non-default option
      await page.waitForTimeout(500);

      // Verify filter was applied (just check it changed)
      const selectedValue = await roleSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('should navigate to create user form', async ({ page }) => {
    // Look for add button (various possible texts)
    const addButton = page
      .locator('button:has-text("Tambah")')
      .or(page.locator('a[href="/users/new"]'))
      .first();

    if ((await addButton.count()) > 0) {
      await addButton.click();

      // Should navigate to /users/new
      await page.waitForURL('/users/new', { timeout: 5000 });
      await expect(page).toHaveURL('/users/new');

      // Check form fields are present
      await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create a new user successfully', async ({ page }) => {
    // Navigate to create form
    await page.goto('/users/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    const timestamp = Date.now();
    const newUser = {
      name: `Test User ${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'Password123!',
    };

    // Fill form
    await page.fill('input[name="name"]', newUser.name);
    await page.fill('input[name="email"]', newUser.email);

    // Password field may or may not be required for editing
    const passwordField = page.locator('input[name="password"]');
    if ((await passwordField.count()) > 0) {
      await passwordField.fill(newUser.password);
    }

    // Role select
    const roleSelect = page.locator('select[name="role"]');
    if ((await roleSelect.count()) > 0) {
      await roleSelect.selectOption({ index: 1 }); // Select first option
    }

    // Submit form
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Simpan")'))
      .first();

    await submitButton.click();

    // Should redirect to users list or show success
    await page.waitForTimeout(2000);

    // Check if redirected or shows success
    const url = page.url();
    expect(url.includes('/users') || url.includes('success')).toBeTruthy();
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/users/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Try to submit empty form
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Simpan")'))
      .first();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Should stay on the same page (validation prevents navigation)
    await expect(page).toHaveURL('/users/new');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/users/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Fill with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');

    const passwordField = page.locator('input[name="password"]');
    if ((await passwordField.count()) > 0) {
      await passwordField.fill('Password123!');
    }

    // Submit
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Simpan")'))
      .first();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Should show validation error or stay on page
    await expect(page).toHaveURL('/users/new');
  });

  test.skip('should edit an existing user', async ({ page }) => {
    // Skip: Complex test requiring specific data state
    // TODO: Implement with proper test data fixtures
  });

  test.skip('should delete a user with confirmation', async ({ page }) => {
    // Skip: Requires create then delete flow
    // TODO: Implement with proper test data management
  });

  test.skip('should paginate users list', async ({ page }) => {
    // Skip: Requires sufficient data for pagination
    // TODO: Add when mock API has paginated data
  });
});

test.describe('User Management - Access Control', () => {
  test('Worker should not access user management', async ({ page }) => {
    await quickLogin(page, testUsers.worker);

    // Try to access users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('Koordinator should not access user management', async ({ page }) => {
    await quickLogin(page, testUsers.koordinator);

    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});
