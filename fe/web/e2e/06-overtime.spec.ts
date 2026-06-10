import { test, expect } from '@playwright/test';
import { quickLogin } from './auth.setup';

test.describe('LBR-1 overtime approval queue', () => {
  test('renders the three-tab queue', async ({ page }) => {
    await quickLogin(page, 'korlap', '/overtime');
    await expect(page).toHaveURL(/\/overtime/);
    await expect(page.getByRole('tab', { name: /menunggu/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /disetujui/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /ditolak/i })).toBeVisible();
  });
});
