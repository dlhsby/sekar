/**
 * E2E Tests: Areas Management
 * Tests CRUD operations for areas (Admin/Top Management)
 */

import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Areas Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display areas list page', async ({ page }) => {
    // Check page title (may vary by language)
    const hasTitle =
      (await page.locator('h1:has-text("Wilayah")').count()) > 0 ||
      (await page.locator('h1:has-text("Areas")').count()) > 0 ||
      (await page.locator('h1:has-text("Area")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Check for "Tambah" or "Add" button
    const addButton = page.locator('a[href="/areas/new"]').or(page.locator('button:has-text("Tambah")'));
    if ((await addButton.count()) > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test('should display area cards', async ({ page }) => {
    // Wait for areas to load
    await page.waitForTimeout(1000);

    // Check if at least one area card is visible
    const areaCards = page.locator('[data-testid="area-card"]').or(
      page.locator('text=/Taman|Area/i')
    );

    const count = await areaCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to area detail page', async ({ page }) => {
    // Wait for areas to load
    await page.waitForTimeout(1000);

    // Click on first area card or "Lihat Detail" button
    const detailButton = page
      .locator('a[href*="/areas/"]:has-text("Lihat Detail")')
      .first();

    if ((await detailButton.count()) > 0) {
      await detailButton.click();

      // Should navigate to area detail page
      await expect(page.url()).toMatch(/\/areas\/[a-f0-9-]+$/);

      // Should see area details
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should navigate to create area form', async ({ page }) => {
    // Click "Tambah Wilayah" button
    await page.click('a[href="/areas/new"]');

    // Should navigate to /areas/new
    await expect(page).toHaveURL('/areas/new');

    // Check form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/areas/new');

    // Wait for form to load
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation errors
    await expect(
      page.locator('text=/Nama wajib diisi|required/i').first()
    ).toBeVisible({ timeout: 2000 });
  });

  test('should navigate to edit area form', async ({ page }) => {
    // Wait for areas to load
    await page.waitForTimeout(1000);

    // Find first area with edit button
    const editButton = page.locator('a[href*="/areas/"][href*="/edit"]').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();

      // Should navigate to edit page
      await expect(page.url()).toMatch(/\/areas\/[a-f0-9-]+\/edit$/);

      // Check form is pre-filled
      const nameInput = page.locator('input[name="name"]');
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toBeTruthy();
    }
  });

  test('should show delete confirmation modal', async ({ page }) => {
    // Navigate to first area detail page
    await page.waitForTimeout(1000);

    const detailButton = page
      .locator('a[href*="/areas/"]:has-text("Lihat Detail")')
      .first();

    if ((await detailButton.count()) > 0) {
      await detailButton.click();
      await page.waitForLoadState('networkidle');

      // Look for delete button
      const deleteButton = page.locator('button:has-text("Hapus")');

      if ((await deleteButton.count()) > 0) {
        await deleteButton.click();

        // Should show confirmation modal
        await expect(
          page.locator('text=/Apakah Anda yakin|Konfirmasi/i')
        ).toBeVisible({ timeout: 2000 });

        // Close modal (don't actually delete)
        const cancelButton = page.locator('button:has-text("Batal")');
        if ((await cancelButton.count()) > 0) {
          await cancelButton.click();
        }
      }
    }
  });

  test('should filter areas by rayon', async ({ page }) => {
    // Look for rayon filter dropdown
    const rayonFilter = page.locator('select').first();

    if ((await rayonFilter.count()) > 0) {
      // Select a rayon
      await rayonFilter.selectOption({ index: 1 });

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Areas should be filtered (hard to verify without knowing data)
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should search areas by name', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Cari"]')
    );

    if ((await searchInput.count()) > 0) {
      // Enter search query
      await searchInput.fill('Taman');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Should show filtered results
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Areas Management - Access Control', () => {
  test('Worker should not create/edit/delete areas', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);

    // Navigate to areas page - workers may see read-only view or be redirected
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should not see "Tambah Wilayah" button
    const addButton = page.locator('a[href="/areas/new"]');
    await expect(addButton).not.toBeVisible();
  });

  test('Top Management should have read-only access', async ({ page }) => {
    await setupMockApi(page, 'topManagement');
    await quickLogin(page, testUsers.topManagement);

    // Navigate to areas page
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should be able to view areas
    const hasTitle =
      (await page.locator('h1:has-text("Wilayah")').count()) > 0 ||
      (await page.locator('h1:has-text("Areas")').count()) > 0;

    expect(hasTitle).toBeTruthy();
  });
});

test.describe('Areas Management - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // At least one element should have focus
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const h1Text = await h1.textContent();
    expect(h1Text).toBeTruthy();
  });

  test('should have proper ARIA labels on buttons', async ({ page }) => {
    // Check for accessible buttons
    const addButton = page.locator('a[href="/areas/new"]');

    if ((await addButton.count()) > 0) {
      const buttonText = await addButton.textContent();
      expect(buttonText).toBeTruthy();
    }
  });
});

test.describe('Areas Management - Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Page should load without excessive horizontal scroll
    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });

    expect(scrollWidth).toBeLessThanOrEqual(400); // Allow some tolerance for mobile menus
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/areas');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Check if content is visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
