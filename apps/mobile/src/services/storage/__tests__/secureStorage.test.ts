/**
 * Secure Storage Tests
 * Unit tests for encrypted storage service
 */

import EncryptedStorage from 'react-native-encrypted-storage';
import {
  setToken,
  getToken,
  removeToken,
  setRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  setUser,
  getUser,
  removeUser,
  clearAll,
  isAuthenticated,
} from '../secureStorage';

// Note: EncryptedStorage is already mocked in jest.setup.js

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setToken', () => {
    it('should store token successfully', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await expect(setToken('test-token')).resolves.toBeUndefined();
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    it('should throw error when storage fails', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setToken('test-token')).rejects.toThrow('Storage error');
    });
  });

  describe('getToken', () => {
    it('should retrieve token successfully', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('test-token');

      const result = await getToken();

      expect(EncryptedStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(result).toBe('test-token');
    });

    it('should return null when no token exists', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getToken();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getToken();

      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove token successfully', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await expect(removeToken()).resolves.toBeUndefined();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should throw error when removal fails', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(removeToken()).rejects.toThrow('Storage error');
    });
  });

  describe('setRefreshToken', () => {
    it('should store refresh token successfully', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await expect(setRefreshToken('test-refresh-token')).resolves.toBeUndefined();
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('refresh_token', 'test-refresh-token');
    });

    it('should throw error when storage fails', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setRefreshToken('test-refresh-token')).rejects.toThrow('Storage error');
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve refresh token successfully', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('test-refresh-token');

      const result = await getRefreshToken();

      expect(EncryptedStorage.getItem).toHaveBeenCalledWith('refresh_token');
      expect(result).toBe('test-refresh-token');
    });

    it('should return null when no refresh token exists', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getRefreshToken();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getRefreshToken();

      expect(result).toBeNull();
    });
  });

  describe('removeRefreshToken', () => {
    it('should remove refresh token successfully', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await expect(removeRefreshToken()).resolves.toBeUndefined();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should throw error when removal fails', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(removeRefreshToken()).rejects.toThrow('Storage error');
    });
  });

  describe('setUser', () => {
    const mockUser = {
      id: 'user-1',
      username: 'worker1',
      full_name: 'Test Worker',
      role: 'satgas' as const,
    };

    it('should store user data as JSON string', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await expect(setUser(mockUser)).resolves.toBeUndefined();
      expect(EncryptedStorage.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(mockUser));
    });

    it('should throw error when storage fails', async () => {
      (EncryptedStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setUser(mockUser)).rejects.toThrow('Storage error');
    });
  });

  describe('getUser', () => {
    const mockUser = {
      id: 1,
      username: 'worker1',
      full_name: 'Test Worker',
      role: 'satgas',
    };

    it('should retrieve and parse user data', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));

      const result = await getUser();

      expect(EncryptedStorage.getItem).toHaveBeenCalledWith('user_data');
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user exists', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getUser();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getUser();

      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

      const result = await getUser();

      expect(result).toBeNull();
    });
  });

  describe('removeUser', () => {
    it('should remove user data successfully', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await expect(removeUser()).resolves.toBeUndefined();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('should throw error when removal fails', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(removeUser()).rejects.toThrow('Storage error');
    });
  });

  describe('clearAll', () => {
    it('should clear all storage successfully', async () => {
      (EncryptedStorage.clear as jest.Mock).mockResolvedValue(undefined);

      await expect(clearAll()).resolves.toBeUndefined();
      expect(EncryptedStorage.clear).toHaveBeenCalled();
    });

    it('should throw error when clear fails', async () => {
      (EncryptedStorage.clear as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(clearAll()).rejects.toThrow('Storage error');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue('test-token');

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (EncryptedStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
