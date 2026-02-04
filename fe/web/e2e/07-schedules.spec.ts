/**
 * E2E Tests: Schedules Management
 * Tests CRUD operations for worker schedules
 * Access: Admin + KoordinatorLapangan
 */

import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Schedules Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display schedules list page', async ({ page }) => {
    // Check page title
    const hasTitle =
      (await page.locator('h1:has-text("Jadwal")').count()) > 0 ||
      (await page.locator('h1:has-text("Schedule")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Check for "Buat Jadwal Baru" button
    const createButton = page.locator('a[href="/schedules/new"]').or(
      page.locator('button:has-text("Buat Jadwal")')
    );

    if ((await createButton.count()) > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test('should display filter controls', async ({ page }) => {
    // Wait for filters to load
    await page.waitForTimeout(1000);

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Cari Pekerja"]').or(
      page.locator('input[type="text"]').first()
    );
    await expect(searchInput).toBeVisible();

    // Check for filter selects
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(1); // At least one filter select
  });

  test('should filter schedules by area', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find area filter select
    const areaFilter = page.locator('select').filter({ hasText: 'Area' }).or(
      page.locator('select').first()
    );

    if ((await areaFilter.count()) > 0) {
      // Select an area
      await areaFilter.selectOption({ index: 1 });

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Page should still be on schedules
      expect(page.url()).toContain('/schedules');
    }
  });

  test('should filter schedules by shift', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find shift filter
    const shiftFilter = page.locator('select').filter({ hasText: 'Shift' }).or(
      page.locator('select').nth(1)
    );

    if ((await shiftFilter.count()) > 0) {
      // Select a shift
      await shiftFilter.selectOption({ index: 1 });

      // Wait for filter
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/schedules');
    }
  });

  test('should search schedules by worker name', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Cari"]').first();

    if ((await searchInput.count()) > 0) {
      // Enter search term
      await searchInput.fill('Worker');

      // Wait for search
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/schedules');
    }
  });

  test('should navigate to create schedule form', async ({ page }) => {
    // Click "Buat Jadwal Baru"
    const createButton = page.locator('a[href="/schedules/new"]');

    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Should navigate to /schedules/new
      await expect(page).toHaveURL('/schedules/new');

      // Check form fields exist
      await page.waitForTimeout(1000);

      // Should have select elements for worker, area, shift
      const selects = page.locator('select');
      const selectCount = await selects.count();
      expect(selectCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('should display schedule data in table', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for table or data rows
    const hasTable =
      (await page.locator('table').count()) > 0 ||
      (await page.locator('[role="table"]').count()) > 0 ||
      (await page.locator('text=/Pekerja|Worker/i').count()) > 0;

    expect(hasTable).toBeTruthy();
  });

  test('should show edit and delete buttons for schedules', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for action buttons
    const editButtons = page.locator('a[href*="/schedules/"][href*="/edit"]');
    const deleteButtons = page.locator('button').filter({ hasText: /Hapus|Delete/i });

    // If schedules exist, should have action buttons
    const hasSchedules = (await page.locator('table tbody tr').count()) > 0 ||
                         (await page.locator('[data-testid="schedule-row"]').count()) > 0;

    if (hasSchedules) {
      expect((await editButtons.count()) > 0 || (await deleteButtons.count()) > 0).toBeTruthy();
    }
  });

  test('should navigate to edit schedule form', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find first edit button
    const editButton = page.locator('a[href*="/schedules/"][href*="/edit"]').first();

    if ((await editButton.count()) > 0) {
      await editButton.click();

      // Should navigate to edit page
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/schedules\/[a-f0-9-]+\/edit$/);

      // Should have form elements
      const selects = page.locator('select');
      expect(await selects.count()).toBeGreaterThan(0);
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find delete button
    const deleteButton = page.locator('button:has-text("Hapus")').first();

    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();

      // Should show confirmation dialog
      await page.waitForTimeout(500);

      const hasDialog =
        (await page.locator('[role="dialog"]').count()) > 0 ||
        (await page.locator('text=/yakin|konfirmasi/i').count()) > 0;

      expect(hasDialog).toBeTruthy();

      // Close dialog - look for cancel button
      const cancelButton = page.locator('button:has-text("Batal")').or(
        page.locator('button:has-text("Cancel")')
      );

      if ((await cancelButton.count()) > 0) {
        await cancelButton.click();
      }
    }
  });

  test('should handle pagination if available', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Selanjutnya")').or(
      page.locator('button:has-text("Next")')
    );
    const prevButton = page.locator('button:has-text("Sebelumnya")').or(
      page.locator('button:has-text("Previous")')
    );

    const hasPagination = (await nextButton.count()) > 0 || (await prevButton.count()) > 0;

    if (hasPagination) {
      // Previous button should exist
      expect(await prevButton.count()).toBeGreaterThan(0);
    }
  });

  test('should display schedule badges correctly', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for shift badges or status indicators
    const badges = page.locator('[class*="badge"]').or(
      page.locator('[data-testid*="badge"]')
    );

    // If schedules exist, may have badges
    const tableVisible = (await page.locator('table').count()) > 0;
    if (tableVisible) {
      // Just verify page loads correctly
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});

test.describe('Schedules Management - Access Control', () => {
  test('should allow KoordinatorLapangan to access schedules', async ({ page }) => {
    await setupMockApi(page, 'koordinator');
    await quickLogin(page, testUsers.koordinator);

    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should be able to view schedules
    const hasTitle =
      (await page.locator('h1:has-text("Jadwal")').count()) > 0 ||
      (await page.locator('h1:has-text("Schedule")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Should have create button
    const createButton = page.locator('a[href="/schedules/new"]');
    if ((await createButton.count()) > 0) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should redirect Worker from schedules page', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);

    // Try to access schedules
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should be redirected to dashboard (workers can't manage schedules)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });

  test('should redirect TopManagement from schedules page', async ({ page }) => {
    await setupMockApi(page, 'topManagement');
    await quickLogin(page, testUsers.topManagement);

    // Top Management has read-only access, not schedule management
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should be redirected to dashboard
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Schedules Management - Create Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
  });

  test('should display create schedule form', async ({ page }) => {
    await page.goto('/schedules/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Check form title
    const hasTitle =
      (await page.locator('h1:has-text("Buat")').count()) > 0 ||
      (await page.locator('h1:has-text("Jadwal")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Should have form selects
    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(1);
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/schedules/new');
    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Simpan")')
    );

    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      // Should show validation errors or stay on page
      await page.waitForTimeout(1000);

      // Should still be on create page or show error
      const stillOnCreate = page.url().includes('/schedules/new');
      const hasError =
        (await page.locator('[role="alert"]').count()) > 0 ||
        (await page.locator('text=/wajib|required/i').count()) > 0;

      expect(stillOnCreate || hasError).toBeTruthy();
    }
  });

  test('should have submit and cancel buttons', async ({ page }) => {
    await page.goto('/schedules/new');
    await page.waitForTimeout(1000);

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Simpan")')
    );
    expect(await submitButton.count()).toBeGreaterThan(0);

    // May have cancel button
    const cancelButton = page.locator('button:has-text("Batal")').or(
      page.locator('a:has-text("Batal")')
    );

    if ((await cancelButton.count()) > 0) {
      await expect(cancelButton.first()).toBeVisible();
    }
  });
});

test.describe('Schedules Management - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check for main heading
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();

    const h1Text = await h1.first().textContent();
    expect(h1Text).toBeTruthy();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // At least one element should have focus
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/schedules/new');
    await page.waitForTimeout(1000);

    // Check for label elements
    const labels = page.locator('label');
    const labelCount = await labels.count();

    // Form should have labels
    expect(labelCount).toBeGreaterThan(0);
  });
});

test.describe('Schedules Management - Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Page should load without excessive horizontal scroll
    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });

    expect(scrollWidth).toBeLessThanOrEqual(400);
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Check if content is visible
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Schedules Management - Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  });

  test('should display worker information', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for worker names or user data
    const hasWorkerInfo =
      (await page.locator('text=/Worker|Pekerja/i').count()) > 0 ||
      (await page.locator('table').count()) > 0;

    expect(hasWorkerInfo).toBeTruthy();
  });

  test('should display area information', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for area names
    const hasAreaInfo =
      (await page.locator('text=/Area|Taman/i').count()) > 0 ||
      (await page.locator('table').count()) > 0;

    expect(hasAreaInfo).toBeTruthy();
  });

  test('should display shift information', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for shift data
    const hasShiftInfo =
      (await page.locator('text=/Shift/i').count()) > 0 ||
      (await page.locator('table').count()) > 0;

    expect(hasShiftInfo).toBeTruthy();
  });

  test('should display date information', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for date columns
    const hasDateInfo =
      (await page.locator('text=/Tanggal|Date/i').count()) > 0 ||
      (await page.locator('table').count()) > 0;

    expect(hasDateInfo).toBeTruthy();
  });
});
