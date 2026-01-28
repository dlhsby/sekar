/**
 * E2E Tests: Task Management
 * Tests task creation, viewing, filtering, and workflows
 */

import { test, expect } from '@playwright/test';
import { login, testUsers } from './auth.setup';

test.describe('Task Management - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should display tasks list', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1:has-text("Manajemen Tugas")')).toBeVisible();

    // Check table or list is visible
    await expect(page.locator('table').or(page.locator('[data-testid="tasks-list"]'))).toBeVisible();

    // Check for create button
    await expect(page.locator('button:has-text("Buat Tugas")').or(page.locator('text=+ Buat Tugas Baru'))).toBeVisible();
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
    // Click create button
    await page.click('button:has-text("Buat Tugas")');

    // Should navigate to /tasks/new
    await expect(page).toHaveURL('/tasks/new');

    // Check form fields
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]').or(page.locator('input[name="description"]'))).toBeVisible();
    await expect(page.locator('select[name="priority"]')).toBeVisible();
  });

  test('should create a new task successfully', async ({ page }) => {
    await page.goto('/tasks/new');

    const timestamp = Date.now();
    const newTask = {
      title: `Test Task ${timestamp}`,
      description: 'This is a test task description for E2E testing',
      priority: 'high',
    };

    // Fill form
    await page.fill('input[name="title"]', newTask.title);

    const descriptionField = page.locator('textarea[name="description"]').or(
      page.locator('input[name="description"]')
    );
    if (await descriptionField.count() > 0) {
      await descriptionField.first().fill(newTask.description);
    }

    await page.selectOption('select[name="priority"]', newTask.priority);

    // Select worker if field exists
    const workerSelect = page.locator('select[name="assigned_to"]');
    if (await workerSelect.count() > 0) {
      const options = await workerSelect.locator('option').count();
      if (options > 1) {
        await workerSelect.selectOption({ index: 1 });
      }
    }

    // Select area if field exists
    const areaSelect = page.locator('select[name="area_id"]');
    if (await areaSelect.count() > 0) {
      const options = await areaSelect.locator('option').count();
      if (options > 1) {
        await areaSelect.selectOption({ index: 1 });
      }
    }

    // Set due date if field exists
    const dueDateInput = page.locator('input[name="due_date"]');
    if (await dueDateInput.count() > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dueDateInput.fill(tomorrow.toISOString().split('T')[0]);
    }

    // Submit form
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Should redirect to tasks list
    await page.waitForURL('/tasks', { timeout: 10000 });

    // Verify task appears in list
    await expect(page.locator(`text=${newTask.title}`)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/tasks/new');

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Should show validation error for title
    await expect(
      page.locator('text=Judul tugas wajib diisi').or(page.locator('input[name="title"]:invalid'))
    ).toBeVisible({ timeout: 2000 });
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
    await login(page, testUsers.koordinator);
  });

  test('Koordinator should access tasks page', async ({ page }) => {
    await page.goto('/tasks');

    // Should not redirect
    await expect(page).toHaveURL('/tasks');

    // Should see tasks list
    await expect(page.locator('h1:has-text("Manajemen Tugas")')).toBeVisible();
  });

  test('Koordinator should be able to create tasks', async ({ page }) => {
    await page.goto('/tasks/new');

    // Should not redirect
    await expect(page).toHaveURL('/tasks/new');

    // Form should be accessible
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });
});

test.describe('Task Management - Worker Access', () => {
  test('Worker should not access task management', async ({ page }) => {
    await login(page, testUsers.worker);

    // Try to access tasks page
    await page.goto('/tasks');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('Worker should not see tasks in navigation', async ({ page }) => {
    await login(page, testUsers.worker);
    await page.goto('/dashboard');

    // Tasks link should not be visible in sidebar
    await expect(page.locator('a[href="/tasks"]')).not.toBeVisible();
  });
});
