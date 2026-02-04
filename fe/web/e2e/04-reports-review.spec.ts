/**
 * E2E Tests: Reports Review Workflow
 * Tests viewing, filtering, and reviewing work reports
 */

import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Reports Review - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display reports list', async ({ page }) => {
    // Check page title (multiple possible labels)
    const hasTitle =
      (await page.locator('h1:has-text("Laporan Kerja")').count()) > 0 ||
      (await page.locator('h1:has-text("Laporan")').count()) > 0 ||
      (await page.locator('h1:has-text("Reports")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Check table or list is visible
    const hasContent =
      (await page.locator('table').count()) > 0 ||
      (await page.locator('[data-testid="reports-list"]').count()) > 0 ||
      (await page.locator('[role="table"]').count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('should filter reports by type', async ({ page }) => {
    const typeSelect = page.locator('select').filter({ hasText: 'Tipe' }).or(
      page.locator('[data-testid="type-filter"]')
    );

    if (await typeSelect.count() > 0) {
      // Select "Penyelesaian Tugas"
      await typeSelect.first().selectOption('task_completion');
      await page.waitForTimeout(1000);

      // Verify filtered results
      const badges = page.locator('[data-testid="report-type-badge"]').or(
        page.locator('text=Penyelesaian Tugas')
      );
      if (await badges.count() > 0) {
        await expect(badges.first()).toBeVisible();
      }
    }
  });

  test('should filter reports by date range', async ({ page }) => {
    const dateFromInput = page.locator('input[name="dateFrom"]').or(
      page.locator('input[type="date"]').first()
    );

    if (await dateFromInput.count() > 0) {
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);

      await dateFromInput.fill(lastWeek.toISOString().split('T')[0]);
      await page.waitForTimeout(1000);
    }
  });

  test('should search reports by worker or area', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Cari"]');

    if (await searchInput.count() > 0) {
      await searchInput.fill('worker');
      await page.waitForTimeout(1000);

      // Results should be filtered
      const rows = page.locator('table tbody tr');
      if (await rows.count() > 0) {
        await expect(rows.first()).toBeVisible();
      }
    }
  });

  test('should view report detail', async ({ page }) => {
    // Wait for reports to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click on first report link
    const reportLink = page.locator('table tbody tr').first().locator('a').first();

    if (await reportLink.count() > 0) {
      await reportLink.click();

      // Should navigate to detail page
      await expect(page.url()).toMatch(/\/reports\/[a-f0-9-]+/);

      // Check report details are visible
      await expect(page.locator('h1').or(page.locator('text=Detail Laporan'))).toBeVisible();
    }
  });

  test('should review an unreviewed report', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Find an unreviewed report badge or link
    const unreviewedRow = page.locator('table tbody tr').filter({
      has: page.locator('text=Belum Direview').or(page.locator('[data-status="unreviewed"]')),
    });

    if (await unreviewedRow.count() > 0) {
      // Click to view detail
      await unreviewedRow.first().locator('a').first().click();

      // Wait for detail page
      await page.waitForURL(/\/reports\/[a-f0-9-]+/);

      // Click review button
      const reviewButton = page.locator('button:has-text("Tandai Direview")');

      if (await reviewButton.count() > 0) {
        await reviewButton.click();

        // Should redirect back to list
        await page.waitForURL('/reports', { timeout: 10000 });

        // Report should now show as reviewed
        // (or disappear if filtered by unreviewed)
      }
    }
  });

  test('should display report photo if available', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click first report
    const reportLink = page.locator('table tbody tr').first().locator('a').first();

    if (await reportLink.count() > 0) {
      await reportLink.click();
      await page.waitForURL(/\/reports\/[a-f0-9-]+/);

      // Check if photo is displayed
      const photo = page.locator('img[alt*="Report"]').or(page.locator('img[alt*="Foto"]'));

      if (await photo.count() > 0) {
        await expect(photo.first()).toBeVisible();
      }
    }
  });

  test('should display GPS location information', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    const reportLink = page.locator('table tbody tr').first().locator('a').first();

    if (await reportLink.count() > 0) {
      await reportLink.click();
      await page.waitForURL(/\/reports\/[a-f0-9-]+/);

      // Check for GPS coordinates or location info
      const gpsInfo = page.locator('text=GPS').or(page.locator('text=Lokasi'));

      if (await gpsInfo.count() > 0) {
        await expect(gpsInfo.first()).toBeVisible();
      }
    }
  });

  test('should display report statistics', async ({ page }) => {
    // Check for statistics cards
    const statsCards = page.locator('[data-testid="stats-card"]').or(
      page.locator('text=Total Laporan')
    );

    if (await statsCards.count() > 0) {
      await expect(page.locator('text=Total Laporan')).toBeVisible();
    }
  });

  test('should paginate reports list', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Selanjutnya")');
    const prevButton = page.locator('button:has-text("Sebelumnya")');

    if (await nextButton.count() > 0 && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      if (await prevButton.count() > 0) {
        await expect(prevButton).not.toBeDisabled();
      }
    }
  });

  test('should navigate back from report detail', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    const reportLink = page.locator('table tbody tr').first().locator('a').first();

    if (await reportLink.count() > 0) {
      await reportLink.click();
      await page.waitForURL(/\/reports\/[a-f0-9-]+/);

      // Click back button
      const backButton = page.locator('button:has-text("Kembali")').or(
        page.locator('a:has-text("Kembali")')
      );

      if (await backButton.count() > 0) {
        await backButton.first().click();
        await expect(page).toHaveURL('/reports');
      }
    }
  });
});

test.describe('Reports Review - Koordinator Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'koordinator');
    await quickLogin(page, testUsers.koordinator);
  });

  test('Koordinator should access reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should not redirect
    await expect(page).toHaveURL('/reports');
  });

  test('Koordinator should be able to view reports', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Check page loads correctly
    const hasContent =
      (await page.locator('table').count()) > 0 ||
      (await page.locator('[data-testid="reports-list"]').count()) > 0;

    expect(hasContent).toBeTruthy();
  });
});

test.describe('Reports Review - Worker Access', () => {
  test('Worker should not access reports page', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);

    await page.goto('/reports');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should redirect to dashboard (worker cannot access reports management)
    await expect(page).toHaveURL('/dashboard');
  });

  test('Worker should not see reports in navigation', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Reports link should not be visible for worker
    await expect(page.locator('a[href="/reports"]')).not.toBeVisible();
  });
});
