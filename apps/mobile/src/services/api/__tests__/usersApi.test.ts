/**
 * Users API Tests
 */

import { changePassword, getUsers } from '../usersApi';
import * as apiClient from '../apiClient';

// Mock apiClient
jest.mock('../apiClient');

describe('usersApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('walks every page so no users are dropped past the limit cap', async () => {
      // Regression: staging has >1000 users; a single capped request drops the
      // tail and assignable-user pickers miss whole rayons. getUsers must page.
      const mockGet = jest
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({ data: { data: [{ id: '1' }], meta: { totalPages: 2 } } } as never)
        .mockResolvedValueOnce({ data: { data: [{ id: '2' }], meta: { totalPages: 2 } } } as never);

      const result = await getUsers();

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(1, '/users', { page: 1, limit: 100 });
      expect(mockGet).toHaveBeenNthCalledWith(2, '/users', { page: 2, limit: 100 });
      expect(result.data).toHaveLength(2);
      expect(result.data?.map((u) => u.id)).toEqual(['1', '2']);
    });

    it('returns an error when the first page fails', async () => {
      jest
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({ error: 'Network error' } as never);

      const result = await getUsers();

      expect(result.data).toEqual([]);
      expect(result.error).toBe('Network error');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockResolvedValue({
        data: undefined,
      });

      const result = await changePassword('old12345678', 'new12345678');

      expect(mockPatch).toHaveBeenCalledWith('/users/me/change-password', {
        current_password: 'old12345678',
        new_password: 'new12345678',
      });

      expect(result).toEqual({ data: undefined });
    });

    it('should return error when API returns error', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockResolvedValue({
        error: 'Password saat ini salah',
      });

      const result = await changePassword('wrongPassword', 'new12345678');

      expect(result).toEqual({ error: 'Password saat ini salah' });
    });

    it('should handle network errors', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockRejectedValue({
        response: {
          data: {
            message: 'Network error',
          },
        },
      });

      const result = await changePassword('old12345678', 'new12345678');

      expect(result).toEqual({ error: 'Network error' });
    });

    it('should handle unknown errors with fallback message', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Unknown error'));

      const result = await changePassword('old12345678', 'new12345678');

      expect(result).toEqual({ error: 'Gagal mengubah password' });
    });

    it('should send correct payload structure', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockResolvedValue({
        data: undefined,
      });

      await changePassword('current123', 'new456');

      expect(mockPatch).toHaveBeenCalledWith('/users/me/change-password', {
        current_password: 'current123',
        new_password: 'new456',
      });
    });
  });
});
