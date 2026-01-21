/**
 * Reports API Tests
 * Unit tests for reports API service
 */

import { createReport, uploadMedia, getMyReports } from '../reportsApi';
import * as apiClient from '../apiClient';
import apiClientDefault from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  __esModule: true,
  get: jest.fn(),
  post: jest.fn(),
  default: {
    post: jest.fn(),
  },
}));

describe('reportsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('should call post with correct endpoint and payload', async () => {
      const mockResponse = {
        data: {
          id: 1,
          message: 'Report created successfully',
        },
      };
      const reportData = {
        shift_id: 1,
        notes: 'Task completed',
        condition: 'good',
        gps_lat: -7.25,
        gps_lng: 112.75,
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await createReport(reportData);

      expect(apiClient.post).toHaveBeenCalledWith('/reports', reportData);
      expect(result).toEqual(mockResponse);
    });

    it('should return error when create fails', async () => {
      const mockError = { error: 'Failed to create report' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await createReport({
        shift_id: 1,
        notes: 'Test',
        gps_lat: -7.25,
        gps_lng: 112.75,
      });

      expect(result).toEqual(mockError);
    });

    it('should handle missing required fields', async () => {
      const mockError = { error: 'Validation error: shift_id is required' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await createReport({} as any);

      expect(result).toEqual(mockError);
    });
  });

  describe('uploadMedia', () => {
    it('should upload media with correct form data', async () => {
      const mockResponse = {
        data: {
          media_id: 1,
          media_url: 'https://example.com/photo.jpg',
        },
      };
      const mockFile = {
        uri: 'file:///path/to/photo.jpg',
        fileName: 'photo.jpg',
      };
      (apiClientDefault.post as jest.Mock).mockResolvedValue({ data: mockResponse.data });

      const result = await uploadMedia(1, mockFile, 'image/jpeg');

      expect(apiClientDefault.post).toHaveBeenCalledWith(
        '/reports/1/upload-media',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle file without fileName', async () => {
      const mockResponse = {
        data: {
          media_id: 1,
          media_url: 'https://example.com/photo.jpg',
        },
      };
      const mockFile = {
        uri: 'file:///path/to/photo.jpg',
      };
      (apiClientDefault.post as jest.Mock).mockResolvedValue({ data: mockResponse.data });

      const result = await uploadMedia(1, mockFile, 'image/jpeg');

      expect(result).toEqual(mockResponse);
    });

    it('should return error when upload fails', async () => {
      (apiClientDefault.post as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      const result = await uploadMedia(1, { uri: 'test' }, 'image/jpeg');

      expect(result).toEqual({ error: 'Upload failed' });
    });

    it('should handle network error', async () => {
      (apiClientDefault.post as jest.Mock).mockRejectedValue({ message: '' });

      const result = await uploadMedia(1, { uri: 'test' }, 'image/jpeg');

      expect(result).toEqual({ error: 'Upload failed' });
    });
  });

  describe('getMyReports', () => {
    it('should call get with correct endpoint', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            notes: 'Report 1',
            report_time: '2026-01-19T10:00:00Z',
          },
          {
            id: 2,
            notes: 'Report 2',
            report_time: '2026-01-19T11:00:00Z',
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMyReports();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/my-reports', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call get with date filter', async () => {
      const mockResponse = { data: [] };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMyReports('2026-01-19');

      expect(apiClient.get).toHaveBeenCalledWith('/reports/my-reports', { date: '2026-01-19' });
      expect(result).toEqual(mockResponse);
    });

    it('should return error when fetch fails', async () => {
      const mockError = { error: 'Failed to fetch reports' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getMyReports();

      expect(result).toEqual(mockError);
    });
  });
});
