/**
 * API Services Index
 * Central export for all API services
 */

// Re-export individual functions
export * from './authApi';
export * from './shiftsApi';
export * from './reportsApi';
export * from './supervisorApi';
export * from './locationApi';
export * from './usersApi';
export { default as apiClient } from './apiClient';

// Export as namespace objects for consumers that prefer `shiftsApi.getCurrentShift()` style
import * as shiftsApiModule from './shiftsApi';
import * as reportsApiModule from './reportsApi';
import * as authApiModule from './authApi';
import * as supervisorApiModule from './supervisorApi';
import * as locationApiModule from './locationApi';
import * as usersApiModule from './usersApi';

export const shiftsApi = shiftsApiModule;
export const reportsApi = reportsApiModule;
export const authApi = authApiModule;
export const supervisorApi = supervisorApiModule;
export const locationApi = locationApiModule;
export const usersApi = usersApiModule;

