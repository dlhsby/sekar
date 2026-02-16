/**
 * API Index Tests
 * Tests for API service exports
 * Phase 2C: activitiesApi replaces reportsApi, monitoring consolidated
 */

import * as shiftsApiModule from '../shiftsApi';
import * as activitiesApiModule from '../activitiesApi';
import * as authApiModule from '../authApi';
import * as locationApiModule from '../locationApi';
import * as usersApiModule from '../usersApi';
import * as shiftDefinitionsApiModule from '../shiftDefinitionsApi';
import * as activityTypesApiModule from '../activityTypesApi';
import * as tasksApiModule from '../tasksApi';
import * as monitoringApiModule from '../monitoringApi';
import * as notificationsApiModule from '../notificationsApi';
import * as overtimeApiModule from '../overtimeApi';
import apiClientModule from '../apiClient';

describe('API Index Exports', () => {
  it('should export authApi', () => {
    expect(authApiModule).toBeDefined();
    expect(authApiModule.login).toBeDefined();
    expect(authApiModule.logout).toBeDefined();
  });

  it('should export shiftsApi', () => {
    expect(shiftsApiModule).toBeDefined();
    expect(shiftsApiModule.clockIn).toBeDefined();
    expect(shiftsApiModule.clockOut).toBeDefined();
    expect(shiftsApiModule.getCurrentShift).toBeDefined();
  });

  it('should export activitiesApi', () => {
    expect(activitiesApiModule).toBeDefined();
    expect(activitiesApiModule.createActivity).toBeDefined();
    expect(activitiesApiModule.getMyActivities).toBeDefined();
    expect(activitiesApiModule.getActivities).toBeDefined();
    expect(activitiesApiModule.getActivityById).toBeDefined();
  });

  it('should export locationApi', () => {
    expect(locationApiModule).toBeDefined();
    expect(locationApiModule.uploadLocationBatch).toBeDefined();
  });

  it('should export monitoringApi with consolidated functions', () => {
    expect(monitoringApiModule).toBeDefined();
    expect(monitoringApiModule.getCityMonitoring).toBeDefined();
    expect(monitoringApiModule.getLiveUsers).toBeDefined();
    expect(monitoringApiModule.getActiveUsers).toBeDefined();
    expect(monitoringApiModule.getAllActivities).toBeDefined();
    expect(monitoringApiModule.getActivityDetails).toBeDefined();
    expect(monitoringApiModule.getAttendance).toBeDefined();
  });

  it('should export usersApi', () => {
    expect(usersApiModule).toBeDefined();
    expect(usersApiModule.changePassword).toBeDefined();
  });

  it('should export shiftDefinitionsApi', () => {
    expect(shiftDefinitionsApiModule).toBeDefined();
    expect(shiftDefinitionsApiModule.getShiftDefinitions).toBeDefined();
  });

  it('should export activityTypesApi', () => {
    expect(activityTypesApiModule).toBeDefined();
    expect(activityTypesApiModule.getActivityTypes).toBeDefined();
  });

  it('should export tasksApi', () => {
    expect(tasksApiModule).toBeDefined();
    expect(tasksApiModule.getTasks).toBeDefined();
    expect(tasksApiModule.getTaskById).toBeDefined();
    expect(tasksApiModule.getTaggedTasks).toBeDefined();
    expect(tasksApiModule.addTaskTags).toBeDefined();
    expect(tasksApiModule.removeTaskTag).toBeDefined();
  });

  it('should export notificationsApi', () => {
    expect(notificationsApiModule).toBeDefined();
    expect(notificationsApiModule.getNotifications).toBeDefined();
  });

  it('should export overtimeApi', () => {
    expect(overtimeApiModule).toBeDefined();
  });

  it('should export apiClient', () => {
    expect(apiClientModule).toBeDefined();
  });

  it('should export all expected APIs as modules', () => {
    const apis = {
      authApi: authApiModule,
      shiftsApi: shiftsApiModule,
      activitiesApi: activitiesApiModule,
      locationApi: locationApiModule,
      usersApi: usersApiModule,
      shiftDefinitionsApi: shiftDefinitionsApiModule,
      activityTypesApi: activityTypesApiModule,
      tasksApi: tasksApiModule,
      monitoringApi: monitoringApiModule,
      notificationsApi: notificationsApiModule,
      overtimeApi: overtimeApiModule,
      apiClient: apiClientModule,
    };

    Object.entries(apis).forEach(([name, api]) => {
      expect(api).toBeDefined();
    });
  });
});
