/**
 * Activities API Service Tests
 * Phase 2C: ADR-010 terminology cleanup (reports → activities)
 */

import * as activitiesApi from '../activitiesApi';
import * as apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

describe('activitiesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    it('creates activity with correct data', async () => {
      const activityData = {
        shift_id: 'shift-123',
        activity_type_id: 'type-001',
        description: 'Menyiram tanaman',
        photos: ['data:image/jpeg;base64,abc123'],
        gps_lat: -7.25,
        gps_lng: 112.75,
      };
      const mockResponse = { data: { id: 'activity-001', ...activityData } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await activitiesApi.createActivity(activityData);

      expect(mockPost).toHaveBeenCalledWith('/activities', activityData);
      expect(result).toEqual(mockResponse);
    });

    it('creates activity with multiple photos', async () => {
      const activityData = {
        shift_id: 'shift-123',
        activity_type_id: 'type-002',
        description: 'Pemotongan rumput',
        photos: [
          'data:image/jpeg;base64,photo1',
          'data:image/jpeg;base64,photo2',
          'data:image/jpeg;base64,photo3',
        ],
        gps_lat: -7.26,
        gps_lng: 112.76,
      };
      const mockResponse = { data: { id: 'activity-002', ...activityData } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await activitiesApi.createActivity(activityData);

      expect(mockPost).toHaveBeenCalledWith('/activities', activityData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyActivities', () => {
    it('gets activities without date filter', async () => {
      const mockResponse = { data: [{ id: 'act-1' }, { id: 'act-2' }] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getMyActivities();

      expect(mockGet).toHaveBeenCalledWith('/activities/my', {});
      expect(result).toEqual(mockResponse);
    });

    it('gets activities with date filter', async () => {
      const mockResponse = { data: [{ id: 'act-1' }] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getMyActivities('2026-02-14');

      expect(mockGet).toHaveBeenCalledWith('/activities/my', { date: '2026-02-14' });
      expect(result).toEqual(mockResponse);
    });

    it('returns empty array when no activities', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getMyActivities();

      expect(result.data).toEqual([]);
    });
  });

  describe('getActivities', () => {
    it('gets activities with filters', async () => {
      const filters = { area_id: 'area-001', date: '2026-02-14' };
      const mockResponse = { data: [{ id: 'act-1' }] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getActivities(filters);

      expect(mockGet).toHaveBeenCalledWith('/activities', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets activities without filters', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getActivities();

      expect(mockGet).toHaveBeenCalledWith('/activities', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getActivityById', () => {
    it('gets activity by ID', async () => {
      const activityId = 'act-123';
      const mockResponse = {
        data: { id: activityId, description: 'Menyiram tanaman' },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activitiesApi.getActivityById(activityId);

      expect(mockGet).toHaveBeenCalledWith(`/activities/${activityId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = activitiesApi.default;
      expect(defaultExport.createActivity).toBeDefined();
      expect(defaultExport.getMyActivities).toBeDefined();
      expect(defaultExport.getActivities).toBeDefined();
      expect(defaultExport.getActivityById).toBeDefined();
    });
  });
});
