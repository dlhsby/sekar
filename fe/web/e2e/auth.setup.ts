/**
 * Authentication Setup for E2E Tests
 * Provides reusable login helpers for different user roles
 */

import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: string;
  expectedName: string;
}

export const testUsers = {
  admin: {
    email: 'admin@sekar.com',
    password: 'admin123',
    role: 'Admin',
    expectedName: 'Admin User',
  },
  koordinator: {
    email: 'koordinator@sekar.com',
    password: 'koordinator123',
    role: 'KoordinatorLapangan',
    expectedName: 'Koordinator Lapangan',
  },
  kepalaRayon: {
    email: 'kepala@sekar.com',
    password: 'kepala123',
    role: 'KepalaRayon',
    expectedName: 'Kepala Rayon',
  },
  worker: {
    email: 'worker@sekar.com',
    password: 'worker123',
    role: 'Worker',
    expectedName: 'Worker User',
  },
};

/**
 * Login helper function
 * Navigates to login page and performs login
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/login');

  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // Verify successful login
  await page.waitForSelector(`text=${user.expectedName}`, { timeout: 5000 });
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
