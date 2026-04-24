/**
 * Auth API Tests
 * Unit tests for authentication API service
 */

import { login, getMe, logout } from '../authApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call post with correct endpoint and payload', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          user: {
            id: 1,
            username: 'worker1',
            full_name: 'Test Worker',
            role: 'satgas',
          },
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await login('worker1', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        identifier: 'worker1',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return error when login fails', async () => {
      const mockError = { error: 'Invalid credentials' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await login('worker1', 'wrongpassword');

      expect(result).toEqual(mockError);
    });

    it('should handle empty credentials', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ error: 'Username and password required' });

      const result = await login('', '');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        identifier: '',
        password: '',
      });
    });
  });

  describe('getMe', () => {
    it('should call get with correct endpoint', async () => {
      const mockResponse = {
        data: {
          id: 1,
          username: 'worker1',
          full_name: 'Test Worker',
          role: 'satgas',
          assigned_area: {
            id: 1,
            name: 'Park A',
            gps_lat: -7.25,
            gps_lng: 112.75,
            radius_meters: 100,
          },
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getMe();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse);
    });

    it('should return error when not authenticated', async () => {
      const mockError = { error: 'Unauthorized' };
      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getMe();

      expect(result).toEqual(mockError);
    });
  });

  describe('logout', () => {
    it('should call post with correct endpoint', async () => {
      const mockResponse = { data: { success: true } };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toEqual(mockResponse);
    });

    it('should return error on failure', async () => {
      const mockError = { error: 'Logout failed' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await logout();

      expect(result).toEqual(mockError);
    });
  });
});
