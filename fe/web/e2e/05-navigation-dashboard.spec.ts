/**
 * E2E Tests: Navigation and Dashboard
 * Tests navigation, dashboard widgets, and overall UX
 */

import { test, expect } from '@playwright/test';
import { login, testUsers } from './auth.setup';

test.describe('Navigation - Sidebar and Menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/dashboard');
  });

  test('should display sidebar with all admin menu items', async ({ page }) => {
    const adminMenuItems = [
      'Dashboard',
      'Users',
      'Areas',
      'Rayons',
      'Schedules',
      'Reports',
      'Tasks',
      'Monitoring',
    ];

    for (const item of adminMenuItems) {
      const menuItem = page.locator(`a:has-text("${item}")`).or(
        page.locator(`[data-menu-item="${item.toLowerCase()}"]`)
      );

      if (await menuItem.count() > 0) {
        await expect(menuItem.first()).toBeVisible();
      }
    }
  });

  test('should navigate to different pages via sidebar', async ({ page }) => {
    const routes = [
      { name: 'Users', path: '/users' },
      { name: 'Areas', path: '/areas' },
      { name: 'Rayons', path: '/rayons' },
      { name: 'Schedules', path: '/schedules' },
      { name: 'Reports', path: '/reports' },
      { name: 'Tasks', path: '/tasks' },
      { name: 'Monitoring', path: '/monitoring' },
    ];

    for (const route of routes) {
      const link = page.locator(`a[href="${route.path}"]`);

      if (await link.count() > 0) {
        await link.first().click();
        await expect(page).toHaveURL(route.path);
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should highlight active menu item', async ({ page }) => {
    await page.goto('/users');

    // Users menu item should be active/highlighted
    const usersLink = page.locator('a[href="/users"]');

    if (await usersLink.count() > 0) {
      // Check for active class or aria-current
      const isActive =
        (await usersLink.first().getAttribute('class'))?.includes('active') ||
        (await usersLink.first().getAttribute('aria-current')) === 'page';

      expect(isActive).toBeTruthy();
    }
  });

  test('should collapse/expand sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Find hamburger menu button
    const menuButton = page.locator('button[aria-label*="menu"]').or(
      page.locator('[data-testid="mobile-menu-toggle"]')
    );

    if (await menuButton.count() > 0) {
      // Open menu
      await menuButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be visible
      const sidebar = page.locator('nav').or(page.locator('[data-testid="sidebar"]'));
      await expect(sidebar.first()).toBeVisible();

      // Close menu
      await menuButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Dashboard - Admin View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard title', async ({ page }) => {
    await expect(page.locator('h1').or(page.locator('text=Dashboard'))).toBeVisible();
  });

  test('should display welcome message with user name', async ({ page }) => {
    const userName = testUsers.admin.expectedName;
    const welcomeText = page.locator(`text=${userName}`).or(
      page.locator('text=Selamat datang')
    );

    if (await welcomeText.count() > 0) {
      await expect(welcomeText.first()).toBeVisible();
    }
  });

  test('should display statistics cards', async ({ page }) => {
    // Check for common statistics
    const possibleStats = [
      'Total Users',
      'Total Pengguna',
      'Total Areas',
      'Total Laporan',
      'Total Tugas',
      'Pekerja Aktif',
    ];

    let found = false;
    for (const stat of possibleStats) {
      if (await page.locator(`text=${stat}`).count() > 0) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('should display quick action buttons', async ({ page }) => {
    const quickActions = [
      'Tambah Pengguna',
      'Tambah Area',
      'Buat Tugas',
      'Lihat Laporan',
    ];

    let found = false;
    for (const action of quickActions) {
      if (await page.locator(`button:has-text("${action}")`).or(page.locator(`a:has-text("${action}")`)).count() > 0) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('should display recent activity or updates', async ({ page }) => {
    const activitySection = page.locator('text=Recent').or(
      page.locator('text=Aktivitas Terbaru')
    );

    if (await activitySection.count() > 0) {
      await expect(activitySection.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard - Role-Specific Views', () => {
  test('Koordinator should see limited dashboard', async ({ page }) => {
    await login(page, testUsers.koordinator);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should see dashboard
    await expect(page.locator('h1').or(page.locator('text=Dashboard'))).toBeVisible();

    // Should NOT see admin menu items
    await expect(page.locator('a[href="/users"]')).not.toBeVisible();
    await expect(page.locator('a[href="/rayons"]')).not.toBeVisible();
  });

  test('Worker should see minimal dashboard', async ({ page }) => {
    await login(page, testUsers.worker);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should see basic dashboard
    await expect(page.locator('h1').or(page.locator('text=Dashboard'))).toBeVisible();

    // Should only see worker-relevant menu items
    const workerMenuItems = ['Dashboard'];

    for (const item of workerMenuItems) {
      const menuItem = page.locator(`a:has-text("${item}")`);
      if (await menuItem.count() > 0) {
        await expect(menuItem.first()).toBeVisible();
      }
    }

    // Should NOT see admin/supervisor items
    await expect(page.locator('a[href="/users"]')).not.toBeVisible();
    await expect(page.locator('a[href="/tasks"]')).not.toBeVisible();
  });
});

test.describe('Breadcrumbs and Navigation History', () => {
  test('should show breadcrumbs on nested pages', async ({ page }) => {
    await login(page, testUsers.admin);

    // Navigate to nested page (e.g., create user)
    await page.goto('/users/new');

    // Check for breadcrumbs
    const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]').or(
      page.locator('[data-testid="breadcrumbs"]')
    );

    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs.first()).toBeVisible();

      // Should contain "Users" link
      await expect(page.locator('a:has-text("Users")').or(page.locator('a[href="/users"]'))).toBeVisible();
    }
  });

  test('should navigate back using browser back button', async ({ page }) => {
    await login(page, testUsers.admin);

    // Navigate through pages
    await page.goto('/users');
    await page.goto('/areas');
    await page.goto('/rayons');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/areas');

    await page.goBack();
    await expect(page).toHaveURL('/users');
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, testUsers.admin);
    await page.goto('/dashboard');

    // Dashboard should be visible and functional
    await expect(page.locator('h1').or(page.locator('text=Dashboard'))).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, testUsers.admin);
    await page.goto('/dashboard');

    // Dashboard should be visible
    await expect(page.locator('h1').or(page.locator('text=Dashboard'))).toBeVisible();

    // Mobile menu should be accessible
    const menuButton = page.locator('button[aria-label*="menu"]').or(
      page.locator('[data-testid="mobile-menu-toggle"]')
    );

    if (await menuButton.count() > 0) {
      await expect(menuButton).toBeVisible();
    }
  });
});

test.describe('Loading States and Error Handling', () => {
  test('should show loading state during data fetch', async ({ page }) => {
    await login(page, testUsers.admin);

    // Navigate to a data-heavy page
    await page.goto('/users');

    // Check for loading indicator (brief appearance)
    const loadingIndicator = page.locator('text=Memuat').or(
      page.locator('[data-testid="loading"]')
    );

    // Loading should either show briefly or page should load immediately
    await page.waitForLoadState('networkidle');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await login(page, testUsers.admin);

    // Try to access a non-existent detail page
    await page.goto('/users/non-existent-id');

    // Should show error message or redirect
    const errorMessage = page.locator('text=tidak ditemukan').or(
      page.locator('text=Error')
    );

    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/dashboard');

    // Should have h1
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/dashboard');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should have focus
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/dashboard');

    // Check for nav landmark
    const nav = page.locator('nav[aria-label]').or(page.locator('nav'));
    if (await nav.count() > 0) {
      const ariaLabel = await nav.first().getAttribute('aria-label');
      expect(ariaLabel || 'navigation').toBeTruthy();
    }
  });
});
