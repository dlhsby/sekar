/**
 * Supervisor API Tests
 * Unit tests for supervisor API service
 */

import { getActiveWorkers, getReports, getReportDetails, reviewReport, getAttendance } from '../supervisorApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

describe('supervisorApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveWorkers', () => {
    it('should call get with correct endpoint and default params', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              worker_id: 1,
              full_name: 'John Doe',
              area_name: 'Park A',
              last_location: { lat: -7.25, lng: 112.75 },
              last_updated: '2026-01-19T10:00:00Z',
            },
          ],
          meta: { total: 1, page: 1, limit: 500, totalPages: 1 },
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getActiveWorkers();

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/active-workers', { page: 1, limit: 500 });
      expect(result).toEqual(mockResponse);
    });

    it('should call get with custom pagination params', async () => {
      const mockResponse = { data: { data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } } };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getActiveWorkers(2, 10);

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/active-workers', { page: 2, limit: 10 });
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch active workers' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getActiveWorkers();

      expect(result).toEqual(mockError);
    });
  });

  describe('getReports', () => {
    it('should call get with correct endpoint and empty filters', async () => {
      const mockResponse = {
        data: [
          { id: 1, worker_name: 'John', area_name: 'Park A', report_time: '2026-01-19T10:00:00Z' },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReports();

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/reports', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call get with date filter', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReports({ date: '2026-01-19' });

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/reports', { date: '2026-01-19' });
    });

    it('should call get with worker_id filter', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReports({ worker_id: 1 });

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/reports', { worker_id: 1 });
    });

    it('should call get with area_id filter', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReports({ area_id: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/reports', { area_id: 5 });
    });

    it('should call get with multiple filters', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReports({ date: '2026-01-19', worker_id: 1, area_id: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/reports', {
        date: '2026-01-19',
        worker_id: 1,
        area_id: 5,
      });
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch reports' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getReports();

      expect(result).toEqual(mockError);
    });
  });

  describe('getReportDetails', () => {
    it('should call get with correct endpoint', async () => {
      const mockResponse = {
        data: {
          id: 1,
          notes: 'Task completed',
          gps_lat: -7.25,
          gps_lng: 112.75,
          worker: { id: 1, full_name: 'John Doe' },
          area: { id: 1, name: 'Park A' },
          media: [],
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getReportDetails(1);

      expect(apiClient.get).toHaveBeenCalledWith('/reports/1');
      expect(result).toEqual(mockResponse);
    });

    it('should return error when report not found', async () => {
      const mockError = { error: 'Report not found' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getReportDetails(999);

      expect(result).toEqual(mockError);
    });
  });

  describe('reviewReport', () => {
    it('should call put with correct endpoint and payload', async () => {
      const mockResponse = {
        data: {
          id: 1,
          reviewed: true,
          reviewed_at: '2026-01-19T12:00:00Z',
        },
      };
      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await reviewReport(1);

      expect(apiClient.put).toHaveBeenCalledWith('/reports/1/review', { reviewed: true });
      expect(result).toEqual(mockResponse);
    });

    it('should return error when review fails', async () => {
      const mockError = { error: 'Failed to review report' };
      (apiClient.put as jest.Mock).mockResolvedValue(mockError);

      const result = await reviewReport(1);

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
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getAttendance();

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/attendance', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call get with date filter', async () => {
      const mockResponse = { data: {} };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getAttendance({ date: '2026-01-18' });

      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/attendance', { date: '2026-01-18' });
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Failed to fetch attendance' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getAttendance();

      expect(result).toEqual(mockError);
    });
  });
});
