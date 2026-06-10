import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('Notifications inbox', () => {
  test('renders the inbox list', async ({ page }) => {
    await quickLogin(page, 'admin', '/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByText('Tugas baru ditugaskan').first()).toBeVisible();
  });

  test('opens a notification detail with a deep-link CTA', async ({ page }) => {
    await quickLogin(page, 'admin', '/notifications/n1');
    await expect(page.getByText('Tugas baru ditugaskan').first()).toBeVisible();
    // task_assigned with a task_id → CTA into the task.
    await expect(page.getByRole('button', { name: /buka tugas terkait/i })).toBeVisible();
  });
});
