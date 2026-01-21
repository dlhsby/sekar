/**
 * Load Current Shift Utility
 * Fetches and syncs the current shift state with Redux
 */

import { getCurrentShift } from '../api/shiftsApi';
import { setCurrentShift } from '../../store/slices/shiftSlice';
import type { AppDispatch } from '../../store/store';

/**
 * Type guard to check if error is an Axios-like error with response status
 */
function isAxiosError(error: unknown): error is { response?: { status?: number } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error
  );
}

/**
 * Load current shift from API and sync with Redux store.
 * Call this after login or on app startup for workers.
 *
 * Only workers have shifts - supervisors and admins don't clock in/out.
 * A 404 response is expected when there's no active shift (worker hasn't clocked in).
 *
 * @param dispatch - Redux dispatch function
 */
export async function loadAndSyncCurrentShift(
  dispatch: AppDispatch,
): Promise<void> {
  try {
    const response = await getCurrentShift();
    dispatch(setCurrentShift(response.data));
  } catch (error: unknown) {
    // 404 = no active shift, set null (expected state for workers who haven't clocked in)
    if (isAxiosError(error) && error.response?.status === 404) {
      dispatch(setCurrentShift(null));
      return;
    }
    // Other errors: log but don't crash app - shift state will remain as-is
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Failed to load current shift:', message);
  }
}
