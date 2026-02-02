/**
 * API Index Tests
 * Tests for API service exports
 */

import * as api from '../index';

describe('API Index Exports', () => {
  it('should export authApi', () => {
    expect(api.authApi).toBeDefined();
    expect(api.authApi.login).toBeDefined();
    expect(api.authApi.logout).toBeDefined();
  });

  it('should export shiftsApi', () => {
    expect(api.shiftsApi).toBeDefined();
    expect(api.shiftsApi.clockIn).toBeDefined();
    expect(api.shiftsApi.clockOut).toBeDefined();
    expect(api.shiftsApi.getCurrentShift).toBeDefined();
  });

  it('should export reportsApi', () => {
    expect(api.reportsApi).toBeDefined();
    expect(api.reportsApi.createReport).toBeDefined();
    expect(api.reportsApi.getMyReports).toBeDefined();
  });

  it('should export locationApi', () => {
    expect(api.locationApi).toBeDefined();
    expect(api.locationApi.uploadLocationBatch).toBeDefined();
  });

  it('should export supervisorApi', () => {
    expect(api.supervisorApi).toBeDefined();
    expect(api.supervisorApi.getActiveWorkers).toBeDefined();
    expect(api.supervisorApi.getReports).toBeDefined();
  });

  it('should export usersApi', () => {
    expect(api.usersApi).toBeDefined();
    expect(api.usersApi.changePassword).toBeDefined();
  });

  it('should export shiftDefinitionsApi', () => {
    expect(api.shiftDefinitionsApi).toBeDefined();
    expect(api.shiftDefinitionsApi.getShiftDefinitions).toBeDefined();
  });

  it('should export activityTypesApi', () => {
    expect(api.activityTypesApi).toBeDefined();
    expect(api.activityTypesApi.getActivityTypes).toBeDefined();
  });

  it('should export tasksApi', () => {
    expect(api.tasksApi).toBeDefined();
    expect(api.tasksApi.getTasks).toBeDefined();
    expect(api.tasksApi.getTaskById).toBeDefined();
  });

  it('should export monitoringApi', () => {
    expect(api.monitoringApi).toBeDefined();
    expect(api.monitoringApi.getCityMonitoring).toBeDefined();
  });

  it('should export notificationsApi', () => {
    expect(api.notificationsApi).toBeDefined();
    expect(api.notificationsApi.getNotifications).toBeDefined();
  });

  it('should export all expected APIs', () => {
    // Verify main API namespaces are exported
    const expectedApis = [
      'authApi',
      'shiftsApi',
      'reportsApi',
      'locationApi',
      'supervisorApi',
      'usersApi',
      'shiftDefinitionsApi',
      'activityTypesApi',
      'tasksApi',
      'monitoringApi',
      'notificationsApi',
      'apiClient',
    ];

    expectedApis.forEach(apiName => {
      expect(api).toHaveProperty(apiName);
      expect(api[apiName as keyof typeof api]).toBeDefined();
    });
  });
});
