/**
 * E2E Tests: User Management
 * Tests CRUD operations for users (Admin only)
 */

import { test, expect } from '@playwright/test';
import { login, testUsers } from './auth.setup';

test.describe('User Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);

    // Navigate to users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
  });

  test('should display users list', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1:has-text("Manajemen Pengguna")')).toBeVisible();

    // Check if table is visible
    await expect(page.locator('table')).toBeVisible();

    // Check for "Tambah Pengguna" button
    await expect(page.locator('button:has-text("Tambah Pengguna")')).toBeVisible();
  });

  test('should search users by name', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Enter search query
    const searchInput = page.locator('input[placeholder*="Cari"]');
    await searchInput.fill('Admin');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify filtered results contain "Admin"
    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const firstRowText = await rows.first().textContent();
      expect(firstRowText?.toLowerCase()).toContain('admin');
    }
  });

  test('should filter users by role', async ({ page }) => {
    // Select role filter
    const roleSelect = page.locator('select[name="role"]').or(
      page.locator('[data-testid="role-filter"]')
    );

    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('Admin');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify results
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should navigate to create user form', async ({ page }) => {
    // Click "Tambah Pengguna" button
    await page.click('button:has-text("Tambah Pengguna")');

    // Should navigate to /users/new
    await expect(page).toHaveURL('/users/new');

    // Check form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('select[name="role"]')).toBeVisible();
  });

  test('should create a new user successfully', async ({ page }) => {
    // Navigate to create form
    await page.goto('/users/new');

    const timestamp = Date.now();
    const newUser = {
      name: `Test User ${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Worker',
    };

    // Fill form
    await page.fill('input[name="name"]', newUser.name);
    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="password"]', newUser.password);
    await page.selectOption('select[name="role"]', newUser.role);

    // Submit form
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Should redirect to users list
    await page.waitForURL('/users', { timeout: 10000 });

    // Verify success message or new user in list
    const userRow = page.locator(`table tbody tr:has-text("${newUser.name}")`);
    await expect(userRow).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/users/new');

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Should show validation errors
    await expect(
      page.locator('text=Nama wajib diisi').or(page.locator('input[name="name"]:invalid'))
    ).toBeVisible({ timeout: 2000 });
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/users/new');

    // Fill with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.selectOption('select[name="role"]', 'Worker');

    // Submit
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Should show email validation error
    await expect(
      page.locator('text=Email tidak valid').or(page.locator('input[name="email"]:invalid'))
    ).toBeVisible({ timeout: 2000 });
  });

  test('should edit an existing user', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click edit button on first user (not current admin)
    const editButton = page.locator('table tbody tr').nth(1).locator('button:has-text("Edit")');

    if (await editButton.count() > 0) {
      await editButton.click();

      // Should navigate to edit page
      await expect(page.url()).toMatch(/\/users\/[a-f0-9-]+\/edit/);

      // Check form is pre-filled
      const nameInput = page.locator('input[name="name"]');
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toBeTruthy();

      // Update name
      await nameInput.fill(`${nameValue} (Updated)`);

      // Submit
      await page.click('button[type="submit"]:has-text("Simpan")');

      // Should redirect back to list
      await page.waitForURL('/users', { timeout: 10000 });
    }
  });

  test('should delete a user with confirmation', async ({ page }) => {
    // Create a test user first
    await page.goto('/users/new');

    const timestamp = Date.now();
    const testUser = {
      name: `Delete Test ${timestamp}`,
      email: `deletetest${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Worker',
    };

    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.selectOption('select[name="role"]', testUser.role);
    await page.click('button[type="submit"]:has-text("Simpan")');

    await page.waitForURL('/users', { timeout: 10000 });

    // Find and delete the user
    const userRow = page.locator(`table tbody tr:has-text("${testUser.name}")`);
    await expect(userRow).toBeVisible();

    const deleteButton = userRow.locator('button:has-text("Hapus")');
    await deleteButton.click();

    // Confirm deletion in modal
    await page.waitForSelector('text=Apakah Anda yakin', { timeout: 2000 });
    await page.click('button:has-text("Hapus"):last-of-type');

    // Wait for deletion to complete
    await page.waitForTimeout(2000);

    // User should be removed from list
    await expect(userRow).not.toBeVisible();
  });

  test('should paginate users list', async ({ page }) => {
    // Check if pagination controls exist
    const nextButton = page.locator('button:has-text("Selanjutnya")');
    const prevButton = page.locator('button:has-text("Sebelumnya")');

    if (await nextButton.count() > 0) {
      // Click next page
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Previous button should be enabled now
      await expect(prevButton).not.toBeDisabled();

      // Click previous to go back
      await prevButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('User Management - Access Control', () => {
  test('Worker should not access user management', async ({ page }) => {
    await login(page, testUsers.worker);

    // Try to access users page
    await page.goto('/users');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Should not see "Manajemen Pengguna" in sidebar
    await expect(page.locator('a[href="/users"]:has-text("Users")')).not.toBeVisible();
  });

  test('Koordinator should not access user management', async ({ page }) => {
    await login(page, testUsers.koordinator);

    await page.goto('/users');
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });
});
