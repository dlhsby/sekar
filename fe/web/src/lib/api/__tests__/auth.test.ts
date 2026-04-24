/**
 * Unit Tests: Auth API
 * Tests authentication API endpoints (login, logout, refresh, getCurrentUser)
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { authApi, LoginCredentials, AuthResponse, User } from '../auth';

describe('Auth API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials: LoginCredentials = {
        identifier: 'admin',
        password: 'admin123',
      };

      const mockResponse: AuthResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        user: {
          id: '1',
          username: 'admin',
          full_name: 'Admin User',
          role: 'admin_system',
        },
      };

      mockAxios.onPost('/auth/login', credentials).reply(200, mockResponse);

      const response = await authApi.login(credentials);

      expect(response).toEqual(mockResponse);
      expect(response.access_token).toBe('access-token-123');
      expect(response.user.username).toBe('admin');
    });

    it('should handle invalid credentials', async () => {
      const credentials: LoginCredentials = {
        identifier: 'invalid',
        password: 'wrong',
      };

      mockAxios.onPost('/auth/login', credentials).reply(401, {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      });

      await expect(authApi.login(credentials)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const credentials: LoginCredentials = {
        identifier: 'admin',
        password: 'admin123',
      };

      mockAxios.onPost('/auth/login').networkError();

      await expect(authApi.login(credentials)).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const credentials: LoginCredentials = {
        identifier: 'admin',
        password: 'admin123',
      };

      mockAxios.onPost('/auth/login').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });

      await expect(authApi.login(credentials)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const mockResponse = { message: 'Logged out successfully' };

      mockAxios.onPost('/auth/logout').reply(200, mockResponse);

      const response = await authApi.logout();

      expect(response).toEqual(mockResponse);
      expect(response.message).toBe('Logged out successfully');
    });

    it('should handle logout errors', async () => {
      mockAxios.onPost('/auth/logout').reply(500, {
        statusCode: 500,
        message: 'Logout failed',
        error: 'InternalServerError',
      });

      await expect(authApi.logout()).rejects.toThrow();
    });

    it('should handle unauthorized logout attempts', async () => {
      mockAxios.onPost('/auth/logout').reply(401, {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });

      await expect(authApi.logout()).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const mockResponse: AuthResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: '1',
          username: 'admin',
          full_name: 'Admin User',
          role: 'admin_system',
        },
      };

      mockAxios.onPost('/auth/refresh').reply(200, mockResponse);

      const response = await authApi.refreshToken();

      expect(response).toEqual(mockResponse);
      expect(response.access_token).toBe('new-access-token');
    });

    it('should handle invalid refresh token', async () => {
      mockAxios.onPost('/auth/refresh').reply(401, {
        statusCode: 401,
        message: 'Invalid refresh token',
        error: 'Unauthorized',
      });

      await expect(authApi.refreshToken()).rejects.toThrow();
    });

    it('should handle expired refresh token', async () => {
      mockAxios.onPost('/auth/refresh').reply(401, {
        statusCode: 401,
        message: 'Refresh token expired',
        error: 'Unauthorized',
      });

      await expect(authApi.refreshToken()).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user', async () => {
      const mockUser: User = {
        id: '1',
        username: 'admin',
        full_name: 'Admin User',
        role: 'admin_system',
      };

      mockAxios.onGet('/auth/me').reply(200, mockUser);

      const user = await authApi.getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(user.username).toBe('admin');
      expect(user.role).toBe('admin_system');
    });

    it('should handle unauthorized access', async () => {
      mockAxios.onGet('/auth/me').reply(401, {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });

      await expect(authApi.getCurrentUser()).rejects.toThrow();
    });

    it('should get user with rayon assignment', async () => {
      const mockUser: User = {
        id: '2',
        username: 'kepala_rayon',
        full_name: 'Kepala Rayon',
        role: 'kepala_rayon',
        rayon_id: 'rayon-1',
      };

      mockAxios.onGet('/auth/me').reply(200, mockUser);

      const user = await authApi.getCurrentUser();

      expect(user.rayon_id).toBe('rayon-1');
    });

    it('should get user with assigned area', async () => {
      const mockUser: User = {
        id: '3',
        username: 'worker1',
        full_name: 'Worker One',
        role: 'satgas',
        assigned_area: {
          id: 'area-1',
          name: 'Taman Bungkul',
          area_type_id: 'type-1',
          gps_lat: -7.289659,
          gps_lng: 112.739208,
          radius_meters: 100,
          address: 'Jl. Raya Darmo',
        },
      };

      mockAxios.onGet('/auth/me').reply(200, mockUser);

      const user = await authApi.getCurrentUser();

      expect(user.assigned_area).toBeDefined();
      expect(user.assigned_area?.name).toBe('Taman Bungkul');
    });
  });

  describe('UserRole type', () => {
    it('should accept all valid roles', () => {
      const validRoles: Array<User['role']> = [
        'admin_system',
        'superadmin',
        'top_management',
        'kepala_rayon',
        'korlap',
        'admin_data',
        'satgas',
        'linmas',
      ];

      validRoles.forEach((role) => {
        const user: User = {
          id: '1',
          username: 'test',
          full_name: 'Test User',
          role,
        };

        expect(user.role).toBe(role);
      });
    });
  });
});
