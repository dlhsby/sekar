/**
 * API Services Index
 * Phase 2C: activities replaces reports, monitoring consolidated
 */

// Re-export individual functions
export * from './authApi';
export * from './shiftsApi';
export * from './activitiesApi';
export * from './locationApi';
export * from './usersApi';
// Phase 2 APIs
export * from './tasksApi';
export * from './activityTypesApi';
export * from './monitoringApi';
export * from './notificationsApi';
export * from './shiftDefinitionsApi';
// Phase 2C APIs
export * from './overtimeApi';
export * from './rayonsApi';
export * from './areasApi';
export { default as apiClient } from './apiClient';

// Namespace exports
import * as shiftsApiModule from './shiftsApi';
import * as activitiesApiModule from './activitiesApi';
import * as authApiModule from './authApi';
import * as locationApiModule from './locationApi';
import * as usersApiModule from './usersApi';
import * as tasksApiModule from './tasksApi';
import * as activityTypesApiModule from './activityTypesApi';
import * as monitoringApiModule from './monitoringApi';
import * as notificationsApiModule from './notificationsApi';
import * as shiftDefinitionsApiModule from './shiftDefinitionsApi';
import * as overtimeApiModule from './overtimeApi';
import * as rayonsApiModule from './rayonsApi';
import * as areasApiModule from './areasApi';

export const shiftsApi = shiftsApiModule;
export const activitiesApi = activitiesApiModule;
export const authApi = authApiModule;
export const locationApi = locationApiModule;
export const usersApi = usersApiModule;
export const tasksApi = tasksApiModule;
export const activityTypesApi = activityTypesApiModule;
export const monitoringApi = monitoringApiModule;
export const notificationsApi = notificationsApiModule;
export const shiftDefinitionsApi = shiftDefinitionsApiModule;
export const overtimeApi = overtimeApiModule;
export const rayonsApi = rayonsApiModule;
export const areasApi = areasApiModule;
