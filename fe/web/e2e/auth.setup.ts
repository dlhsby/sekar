/**
 * Authentication Setup for E2E Tests
 * Provides reusable login helpers for different user roles
 */

import { Page } from '@playwright/test';
import { setupMockApi, setMockAuthCookies, USE_REAL_API, mockUsers } from './fixtures/mock-api';

export interface TestUser {
  username: string;
  password: string;
  role: string;
  expectedName: string;
}

export const testUsers = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    expectedName: 'Admin',
  },
  koordinator: {
    username: 'koordinator_bungkul',
    password: 'password123',
    role: 'koordinator_lapangan',
    expectedName: 'Koordinator',
  },
  kepalaRayon: {
    username: 'kepala_rayon_selatan',
    password: 'password123',
    role: 'kepala_rayon',
    expectedName: 'Kepala Rayon',
  },
  worker: {
    username: 'worker1',
    password: 'worker123',
    role: 'worker',
    expectedName: 'Worker',
  },
  topManagement: {
    username: 'top_management1',
    password: 'password123',
    role: 'top_management',
    expectedName: 'Top Management',
  },
};

/**
 * Login helper function
 * Navigates to login page and performs login
 * Uses mock API unless USE_REAL_API=true is set
 */
export async function login(page: Page, user: TestUser) {
  // Map test user to mock user role
  const roleMap: Record<string, keyof typeof mockUsers> = {
    admin: 'admin',
    koordinator_lapangan: 'koordinator',
    kepala_rayon: 'kepalaRayon',
    worker: 'worker',
    top_management: 'topManagement',
  };

  const mockUserRole = roleMap[user.role] || 'admin';

  // Setup mock API routes before navigating
  await setupMockApi(page, mockUserRole);

  await page.goto('/login');

  // Wait for form to be ready
  await page.waitForSelector('input[name="username"]', { timeout: 5000 });

  // Fill login form
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: USE_REAL_API ? 10000 : 5000 });
}

/**
 * Quick login using cookies (bypasses login form)
 * Faster for tests that don't need to test login flow
 */
export async function quickLogin(page: Page, user: TestUser) {
  // Map test user to mock user role
  const roleMap: Record<string, keyof typeof mockUsers> = {
    admin: 'admin',
    koordinator_lapangan: 'koordinator',
    kepala_rayon: 'kepalaRayon',
    worker: 'worker',
    top_management: 'topManagement',
  };

  const mockUserRole = roleMap[user.role] || 'admin';

  // Setup mock API routes
  await setupMockApi(page, mockUserRole);

  // Set authentication cookies
  await setMockAuthCookies(page, mockUserRole);

  // Navigate directly to dashboard
  await page.goto('/dashboard');

  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 5000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click profile menu
  await page.click('[data-testid="profile-menu"]');

  // Click logout button
  await page.click('text=Keluar');

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const currentUrl = page.url();
    return !currentUrl.includes('/login');
  } catch {
    return false;
  }
}
