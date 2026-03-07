/**
 * Monitoring API Service Tests
 * Phase 2C: consolidated monitoring + supervisor endpoints
 */

import * as monitoringApi from '../monitoringApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('monitoringApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCityMonitoring', () => {
    it('gets city monitoring stats without filters', async () => {
      const mockResponse = {
        data: {
          total_users: 100,
          online_users: 80,
          offline_users: 20,
          total_areas: 10,
          staffed_areas: 8,
          understaffed_areas: 2,
          rayons: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getCityMonitoring();

      expect(mockGet).toHaveBeenCalledWith('/monitoring/city', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets city monitoring stats with date filter', async () => {
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { total_users: 100 } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getCityMonitoring(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/city', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRayonMonitoring', () => {
    it('gets rayon monitoring stats', async () => {
      const rayonId = 'rayon-123';
      const mockResponse = {
        data: {
          rayon_id: rayonId,
          rayon_name: 'Rayon Selatan',
          total_users: 50,
          areas: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getRayonMonitoring(rayonId);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/rayon/${rayonId}`,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets rayon monitoring stats with filters', async () => {
      const rayonId = 'rayon-123';
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { rayon_id: rayonId } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getRayonMonitoring(rayonId, filters);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/rayon/${rayonId}`,
        filters,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAreaMonitoring', () => {
    it('gets area monitoring stats', async () => {
      const areaId = 'area-123';
      const mockResponse = {
        data: {
          area_id: areaId,
          area_name: 'Taman Bungkul',
          staffing_status: 'adequate',
          users: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAreaMonitoring(areaId);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/area/${areaId}`,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets area monitoring stats with filters', async () => {
      const areaId = 'area-123';
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { area_id: areaId } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAreaMonitoring(areaId, filters);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/area/${areaId}`,
        filters,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLiveUsers', () => {
    it('gets live users without filters', async () => {
      const mockResponse = {
        data: {
          total_online: 0,
          total_offline: 0,
          users: [],
          generated_at: '2026-01-25T10:00:00Z',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveUsers();

      expect(mockGet).toHaveBeenCalledWith(
        '/monitoring/live-users',
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets live users with area filter', async () => {
      const filters = { area_id: 'area-123' };
      const mockResponse = {
        data: {
          total_online: 1,
          total_offline: 0,
          users: [
            { id: 'user-1', full_name: 'User 1', latitude: -7.25, longitude: 112.75 },
          ],
          generated_at: '2026-01-25T10:00:00Z',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveUsers(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/live-users', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets live users with rayon filter', async () => {
      const filters = { rayon_id: 'rayon-123' };
      const mockResponse = {
        data: {
          total_online: 0,
          total_offline: 0,
          users: [],
          generated_at: '2026-01-25T10:00:00Z',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveUsers(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/live-users', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getActiveUsers', () => {
    it('should call get with correct endpoint', async () => {
      const mockResponse = {
        data: {
          users: [
            {
              id: 'uuid-1',
              username: 'user1',
              full_name: 'John Doe',
              shift: {
                id: 'shift-1',
                clock_in_time: '2026-01-19T08:00:00Z',
                area: { id: 'area-1', name: 'Park A' },
              },
              latest_location: { gps_lat: -7.25, gps_lng: 112.75, logged_at: '2026-01-19T10:00:00Z' },
            },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getActiveUsers();

      expect(mockGet).toHaveBeenCalledWith('/supervisor/active-users');
      expect(result).toEqual(mockResponse);
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch active users' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getActiveUsers();

      expect(result).toEqual(mockError);
    });
  });

  describe('getAllActivities', () => {
    it('should call get with /activities endpoint and empty params', async () => {
      const mockResponse = {
        data: [
          { id: 'uuid-1', user_name: 'John', area_name: 'Park A', activity_time: '2026-01-19T10:00:00Z' },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAllActivities();

      expect(mockGet).toHaveBeenCalledWith('/activities', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call get with user_id filter', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAllActivities({ user_id: 'uuid-123' });

      expect(mockGet).toHaveBeenCalledWith('/activities', { user_id: 'uuid-123' });
    });

    it('should call get with area_id filter', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAllActivities({ area_id: 'uuid-456' });

      expect(mockGet).toHaveBeenCalledWith('/activities', { area_id: 'uuid-456' });
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch activities' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getAllActivities();

      expect(result).toEqual(mockError);
    });
  });

  describe('getActivityDetails', () => {
    it('should call get with correct endpoint (UUID)', async () => {
      const mockResponse = {
        data: {
          id: 'uuid-activity-123',
          description: 'Task completed',
          gps_lat: -7.25,
          gps_lng: 112.75,
          user: { id: 'uuid-user-1', full_name: 'John Doe' },
          area: { id: 'uuid-area-1', name: 'Park A' },
          media: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getActivityDetails('uuid-activity-123');

      expect(mockGet).toHaveBeenCalledWith('/activities/uuid-activity-123');
      expect(result).toEqual(mockResponse);
    });

    it('should return error when activity not found', async () => {
      const mockError = { error: 'Activity not found' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getActivityDetails('uuid-not-found');

      expect(result).toEqual(mockError);
    });
  });

  describe('getAttendance', () => {
    it('should call get with correct endpoint and empty filters', async () => {
      const mockResponse = {
        data: {
          date: '2026-01-19',
          total_workers: 10,
          clocked_in_count: 7,
          not_clocked_in: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAttendance();

      expect(mockGet).toHaveBeenCalledWith('/supervisor/attendance', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call get with date filter', async () => {
      const mockResponse = { data: {} };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAttendance({ date: '2026-01-18' });

      expect(mockGet).toHaveBeenCalledWith('/supervisor/attendance', { date: '2026-01-18' });
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch attendance' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getAttendance();

      expect(result).toEqual(mockError);
    });
  });

  describe('getUserDaySummary', () => {
    it('gets user day summary with correct endpoint', async () => {
      const userId = 'user-abc-123';
      const mockResponse = {
        data: {
          user_id: userId,
          date: '2026-03-05',
          total_shifts: 1,
          total_active_minutes: 420,
          areas_visited: ['Taman Bungkul', 'Taman Prestasi'],
          status_breakdown: {
            active: 380,
            inactive: 30,
            outside_area: 10,
            missing: 0,
          },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getUserDaySummary(userId);

      expect(mockGet).toHaveBeenCalledWith(`/monitoring/users/${userId}/day-summary`);
      expect(result).toEqual(mockResponse);
    });

    it('returns error on failure', async () => {
      const mockError = { error: 'User not found' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getUserDaySummary('user-not-found');

      expect(result).toEqual(mockError);
    });
  });

  describe('getUserLocationHistory', () => {
    it('gets location history with date only', async () => {
      const userId = 'user-abc-123';
      const date = '2026-03-05';
      const mockResponse = {
        data: {
          user_id: userId,
          date,
          locations: [
            { gps_lat: -7.2575, gps_lng: 112.7521, logged_at: '2026-03-05T08:00:00Z' },
            { gps_lat: -7.2580, gps_lng: 112.7525, logged_at: '2026-03-05T08:05:00Z' },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getUserLocationHistory(userId, date);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/users/${userId}/location-history`,
        { date },
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets location history with date and shiftId', async () => {
      const userId = 'user-abc-123';
      const date = '2026-03-05';
      const shiftId = 'shift-xyz-456';
      const mockResponse = {
        data: {
          user_id: userId,
          date,
          shift_id: shiftId,
          locations: [
            { gps_lat: -7.2575, gps_lng: 112.7521, logged_at: '2026-03-05T08:00:00Z' },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getUserLocationHistory(userId, date, shiftId);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/users/${userId}/location-history`,
        { date, shift_id: shiftId },
      );
      expect(result).toEqual(mockResponse);
    });

    it('returns error on failure', async () => {
      const mockError = { error: 'Failed to fetch location history' };
      mockGet.mockResolvedValue(mockError);

      const result = await monitoringApi.getUserLocationHistory('user-abc-123', '2026-03-05');

      expect(result).toEqual(mockError);
    });
  });

  describe('getStaffingSummary', () => {
    it('gets staffing summary without filters', async () => {
      const mockResponse = {
        data: {
          total_areas: 42,
          adequately_staffed: 30,
          understaffed: 12,
          overstaffed: 0,
          areas: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getStaffingSummary();

      expect(mockGet).toHaveBeenCalledWith('/monitoring/staffing-summary', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets staffing summary with area_id filter', async () => {
      const filters = { area_id: 'area-456' };
      const mockResponse = {
        data: {
          total_areas: 1,
          adequately_staffed: 1,
          understaffed: 0,
          overstaffed: 0,
          areas: [{ area_id: 'area-456', area_name: 'Taman Bungkul', status: 'adequate' }],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getStaffingSummary(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/staffing-summary', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets staffing summary with rayon_id filter', async () => {
      const filters = { rayon_id: 'rayon-789' };
      const mockResponse = {
        data: {
          total_areas: 5,
          adequately_staffed: 3,
          understaffed: 2,
          overstaffed: 0,
          areas: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getStaffingSummary(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/staffing-summary', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = monitoringApi.default;
      expect(defaultExport.getCityMonitoring).toBeDefined();
      expect(defaultExport.getRayonMonitoring).toBeDefined();
      expect(defaultExport.getAreaMonitoring).toBeDefined();
      expect(defaultExport.getLiveUsers).toBeDefined();
      expect(defaultExport.getActiveUsers).toBeDefined();
      expect(defaultExport.getAllActivities).toBeDefined();
      expect(defaultExport.getActivityDetails).toBeDefined();
      expect(defaultExport.getAttendance).toBeDefined();
      expect(defaultExport.getUserDaySummary).toBeDefined();
      expect(defaultExport.getUserLocationHistory).toBeDefined();
      expect(defaultExport.getStaffingSummary).toBeDefined();
    });
  });
});
