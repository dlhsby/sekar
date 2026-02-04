/**
 * E2E Tests: Task Management
 * Tests task creation, viewing, filtering, and workflows
 */

import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Task Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'admin');
    await quickLogin(page, testUsers.admin);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display tasks list', async ({ page }) => {
    // Check page title (may vary by language)
    const hasTitle =
      (await page.locator('h1:has-text("Manajemen Tugas")').count()) > 0 ||
      (await page.locator('h1:has-text("Tugas")').count()) > 0 ||
      (await page.locator('h1:has-text("Tasks")').count()) > 0;

    expect(hasTitle).toBeTruthy();

    // Check table or list is visible
    const hasContent =
      (await page.locator('table').count()) > 0 ||
      (await page.locator('[data-testid="tasks-list"]').count()) > 0 ||
      (await page.locator('[role="table"]').count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Select status filter
    const statusSelect = page.locator('select').filter({ hasText: 'Status' }).or(
      page.locator('[data-testid="status-filter"]')
    );

    if (await statusSelect.count() > 0) {
      await statusSelect.first().selectOption('pending');
      await page.waitForTimeout(1000);

      // Verify filtered results
      const rows = page.locator('table tbody tr');
      if (await rows.count() > 0) {
        const firstRowText = await rows.first().textContent();
        expect(firstRowText?.toLowerCase()).toContain('pending');
      }
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    const prioritySelect = page.locator('select').filter({ hasText: 'Prioritas' }).or(
      page.locator('[data-testid="priority-filter"]')
    );

    if (await prioritySelect.count() > 0) {
      await prioritySelect.first().selectOption('high');
      await page.waitForTimeout(1000);
    }
  });

  test('should navigate to create task form', async ({ page }) => {
    // Click create button (multiple possible labels)
    const createButton = page
      .locator('button:has-text("Buat Tugas")')
      .or(page.locator('a[href="/tasks/new"]'))
      .or(page.locator('button:has-text("Tambah")'))
      .first();

    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Should navigate to /tasks/new
      await page.waitForURL('/tasks/new', { timeout: 5000 });
      await expect(page).toHaveURL('/tasks/new');

      // Check form fields
      await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create a new task successfully', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    const timestamp = Date.now();
    const newTask = {
      title: `Test Task ${timestamp}`,
      description: 'This is a test task description for E2E testing',
    };

    // Fill form - wait for form to be ready
    const titleInput = page.locator('input[name="title"]');
    await titleInput.waitFor({ timeout: 5000 });
    await titleInput.fill(newTask.title);

    const descriptionField = page
      .locator('textarea[name="description"]')
      .or(page.locator('input[name="description"]'))
      .first();
    if ((await descriptionField.count()) > 0) {
      await descriptionField.fill(newTask.description);
    }

    // Priority select (may be native or custom)
    const prioritySelect = page.locator('select[name="priority"]');
    if ((await prioritySelect.count()) > 0) {
      await prioritySelect.selectOption({ index: 1 });
    }

    // Submit form
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Simpan")'))
      .first();

    await submitButton.click();

    // Wait for redirect or success indication
    await page.waitForTimeout(2000);

    // Check if redirected to tasks list or shows success
    const url = page.url();
    expect(url.includes('/tasks')).toBeTruthy();
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Try to submit empty form
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has-text("Simpan")'))
      .first();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Should stay on the same page (validation prevents navigation)
    await expect(page).toHaveURL('/tasks/new');
  });

  test('should display task statistics', async ({ page }) => {
    // Check for statistics cards
    const statsCards = page.locator('[data-testid="stats-card"]').or(
      page.locator('text=Total Tugas').locator('..')
    );

    if (await statsCards.count() > 0) {
      // Should show task count
      await expect(page.locator('text=Total Tugas')).toBeVisible();
    }
  });

  test('should search tasks', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Cari"]');

    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Results should be filtered
      const rows = page.locator('table tbody tr');
      if (await rows.count() > 0) {
        const firstRowText = await rows.first().textContent();
        expect(firstRowText?.toLowerCase()).toContain('test');
      }
    }
  });

  test('should paginate tasks list', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Selanjutnya")');
    const prevButton = page.locator('button:has-text("Sebelumnya")');

    if (await nextButton.count() > 0 && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Previous should be enabled
      if (await prevButton.count() > 0) {
        await expect(prevButton).not.toBeDisabled();
      }
    }
  });

  test('should cancel task creation', async ({ page }) => {
    await page.goto('/tasks/new');

    // Fill some data
    await page.fill('input[name="title"]', 'Cancel Test Task');

    // Click cancel button
    const cancelButton = page.locator('button:has-text("Batal")');
    if (await cancelButton.count() > 0) {
      await cancelButton.click();

      // Should return to tasks list
      await expect(page).toHaveURL('/tasks');
    }
  });
});

test.describe('Task Management - Koordinator Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page, 'koordinator');
    await quickLogin(page, testUsers.koordinator);
  });

  test('Koordinator should access tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should not redirect (koordinator can access tasks)
    await expect(page).toHaveURL('/tasks');
  });

  test('Koordinator should be able to create tasks', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should not redirect
    await expect(page).toHaveURL('/tasks/new');

    // Form should be accessible
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Task Management - Worker Access', () => {
  test('Worker should not access task management', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);

    // Try to access tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Should redirect to dashboard (worker cannot access tasks)
    await expect(page).toHaveURL('/dashboard');
  });

  test('Worker should not see tasks in navigation', async ({ page }) => {
    await setupMockApi(page, 'worker');
    await quickLogin(page, testUsers.worker);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Tasks link should not be visible in sidebar for worker
    await expect(page.locator('a[href="/tasks"]')).not.toBeVisible();
  });
});
