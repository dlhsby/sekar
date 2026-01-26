/**
 * Shift Configuration Constants
 *
 * Centralized shift-related configuration values used across the application.
 * These constants ensure consistency in shift validation and business rules.
 */

/**
 * Minimum shift duration in minutes
 *
 * Business Rule: Workers must work for at least this duration before clocking out.
 * This prevents accidental clock-outs and ensures meaningful work periods.
 *
 * Rationale: 5 minutes is enough time for setup/arrival but prevents immediate
 * clock-in/clock-out which could indicate errors or abuse.
 *
 * Configuration: This value is configurable via the MINIMUM_SHIFT_DURATION_MINUTES
 * environment variable. Defaults to 5 minutes if not set.
 *
 * Updated from 15 minutes based on user feedback during testing.
 */
export const MINIMUM_SHIFT_DURATION_MINUTES = parseInt(
  process.env.MINIMUM_SHIFT_DURATION_MINUTES || '5',
  10,
);

/**
 * Minimum shift duration in milliseconds (calculated)
 */
export const MINIMUM_SHIFT_DURATION_MS = MINIMUM_SHIFT_DURATION_MINUTES * 60 * 1000;

/**
 * Maximum shift duration in hours
 *
 * Business Rule: Shifts longer than this are flagged for review.
 * Workers should not have continuous shifts beyond reasonable work hours.
 *
 * Rationale: 12 hours is a reasonable maximum for a work shift in Indonesia.
 * Longer shifts may indicate forgotten clock-outs.
 */
export const MAXIMUM_SHIFT_DURATION_HOURS = 12;

/**
 * Maximum shift duration in milliseconds (calculated)
 */
export const MAXIMUM_SHIFT_DURATION_MS = MAXIMUM_SHIFT_DURATION_HOURS * 60 * 60 * 1000;

/**
 * Auto-clockout duration in hours
 *
 * Business Rule: If a worker forgets to clock out, the system will automatically
 * clock them out after this duration from the last location ping.
 *
 * Rationale: 24 hours ensures next-day shifts can start. Supervisors are notified
 * for manual review of auto-clocked-out shifts.
 *
 * Note: This is for Phase 2 implementation.
 */
export const AUTO_CLOCKOUT_DURATION_HOURS = 24;
