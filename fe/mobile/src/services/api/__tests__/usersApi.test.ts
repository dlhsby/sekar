/**
 * Users API Tests
 */

import { changePassword } from '../usersApi';
import * as apiClient from '../apiClient';

// Mock apiClient
jest.mock('../apiClient');

describe('usersApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockResolvedValue({
        data: undefined,
      });

      const result = await changePassword('oldPassword123', 'newPassword123');

      expect(mockPatch).toHaveBeenCalledWith('/users/me/change-password', {
        current_password: 'oldPassword123',
        new_password: 'newPassword123',
      });

      expect(result).toEqual({ data: undefined });
    });

    it('should return error when API returns error', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockResolvedValue({
        error: 'Password saat ini salah',
      });

      const result = await changePassword('wrongPassword', 'newPassword123');

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

      const result = await changePassword('oldPassword123', 'newPassword123');

      expect(result).toEqual({ error: 'Network error' });
    });

    it('should handle unknown errors with fallback message', async () => {
      const mockPatch = jest.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Unknown error'));

      const result = await changePassword('oldPassword123', 'newPassword123');

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
