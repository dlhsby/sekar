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
// Phase 2 APIs
export * from './tasksApi';
export * from './activityTypesApi';
export * from './monitoringApi';
export * from './notificationsApi';
export * from './shiftDefinitionsApi';
export { default as apiClient } from './apiClient';

// Export as namespace objects for consumers that prefer `shiftsApi.getCurrentShift()` style
import * as shiftsApiModule from './shiftsApi';
import * as reportsApiModule from './reportsApi';
import * as authApiModule from './authApi';
import * as supervisorApiModule from './supervisorApi';
import * as locationApiModule from './locationApi';
import * as usersApiModule from './usersApi';
// Phase 2
import * as tasksApiModule from './tasksApi';
import * as activityTypesApiModule from './activityTypesApi';
import * as monitoringApiModule from './monitoringApi';
import * as notificationsApiModule from './notificationsApi';
import * as shiftDefinitionsApiModule from './shiftDefinitionsApi';

export const shiftsApi = shiftsApiModule;
export const reportsApi = reportsApiModule;
export const authApi = authApiModule;
export const supervisorApi = supervisorApiModule;
export const locationApi = locationApiModule;
export const usersApi = usersApiModule;
// Phase 2
export const tasksApi = tasksApiModule;
export const activityTypesApi = activityTypesApiModule;
export const monitoringApi = monitoringApiModule;
export const notificationsApi = notificationsApiModule;
export const shiftDefinitionsApi = shiftDefinitionsApiModule;
