/**
 * Reports Screen Constants
 * Phase 5-1: Role access and local type definitions
 */

import type { UserRole } from '../../types/models.types';

/**
 * Roles that can view and generate reports
 * Mirrors backend REPORTING_VIEWERS
 */
export const REPORT_VIEWERS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'admin_rayon',
  'management',
  'admin_system',
  'superadmin',
];

/**
 * Check if a role can access reporting screens
 */
export function canViewReports(role: UserRole | undefined): boolean {
  return role ? REPORT_VIEWERS.includes(role) : false;
}
