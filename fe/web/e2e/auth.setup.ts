/**
 * Authentication helpers for E2E tests (Phase 4-R — ADR-009 roles, `/` home).
 */

import { Page, expect } from '@playwright/test';
import { setupMockApi, setMockAuthCookies, USE_REAL_API, mockUsers, type MockUserKey } from './fixtures/mock-api';

export interface TestUser {
  username: string;
  password: string;
  role: MockUserKey;
  expectedName: string;
}

export const testUsers: Record<MockUserKey, TestUser> = {
  admin: { username: 'admin', password: 'password123', role: 'admin', expectedName: 'Admin Sistem' },
  superadmin: { username: 'superadmin', password: 'password123', role: 'superadmin', expectedName: 'Super Admin' },
  korlap: { username: 'korlap1', password: 'password123', role: 'korlap', expectedName: 'Koordinator Lapangan' },
  kepalaRayon: { username: 'kepala_rayon1', password: 'password123', role: 'kepalaRayon', expectedName: 'Kepala Rayon Selatan' },
  topManagement: { username: 'topmgmt1', password: 'password123', role: 'topManagement', expectedName: 'Top Management' },
  adminData: { username: 'admindata1', password: 'password123', role: 'adminData', expectedName: 'Admin Data' },
  staffKecamatan: { username: 'kecamatan1', password: 'password123', role: 'staffKecamatan', expectedName: 'Staff Kecamatan Tegalsari' },
};

/** Full login through the form; lands on the dashboard home (`/`). */
export async function login(page: Page, user: TestUser) {
  await setupMockApi(page, user.role);
  await page.goto('/login');
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
  await page.fill('input[name="identifier"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: USE_REAL_API ? 10000 : 8000,
  });
}

/** Fast login via cookies; navigates straight to `path` (default `/`). */
export async function quickLogin(page: Page, role: MockUserKey = 'admin', path = '/') {
  await setupMockApi(page, role);
  await setMockAuthCookies(page, role);
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/** Logout via the header user menu → confirm modal. */
export async function logout(page: Page) {
  await page.getByLabel('User menu').click();
  await page.getByRole('menuitem', { name: /keluar/i }).click();
  // Confirm in the "Konfirmasi Keluar" dialog.
  await page.getByRole('dialog').getByRole('button', { name: /keluar/i }).click();
  await page.waitForURL('**/login', { timeout: 8000 });
}

export { mockUsers, expect };
