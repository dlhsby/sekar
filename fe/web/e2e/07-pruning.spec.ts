import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('PRT-1 pruning requests', () => {
  test('admin list renders submissions with a status pill', async ({ page }) => {
    await quickLogin(page, 'adminData', '/pruning-requests');
    await expect(page).toHaveURL(/\/pruning-requests/);
    await expect(page.getByText('PR-2026-001').first()).toBeVisible();
    await expect(page.getByText(/terkirim/i).first()).toBeVisible();
  });

  test('detail shows the section-card stack and review action', async ({ page }) => {
    await quickLogin(page, 'adminData', '/pruning-requests/pr1');
    await expect(page.getByRole('heading', { name: /PR-2026-001/i })).toBeVisible();
    await expect(page.getByText(/detail permohonan/i)).toBeVisible();
    // submitted → review actions available
    await expect(page.getByRole('button', { name: /setujui/i })).toBeVisible();
  });
});
