/**
 * Token Utils Tests
 * Tests for JWT token validation, decoding, and expiry checking
 */

import {
  isTokenExpired,
  getTokenExpiry,
  getTokenTimeRemaining,
} from '../tokenUtils';
import * as secureStorage from '../../services/storage/secureStorage';

// Mock secure storage
jest.mock('../../services/storage/secureStorage', () => ({
  getToken: jest.fn(),
}));

// Mock console methods to avoid cluttering test output
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('tokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleDebug.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('isTokenExpired', () => {
    it('should return true when no token is found', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue(null);

      const result = await isTokenExpired();

      expect(result).toBe(true);
      expect(mockConsoleDebug).toHaveBeenCalledWith('[TokenUtils] No token found');
    });

    it('should return true when token is invalid (not a JWT)', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue('invalid-token');

      const result = await isTokenExpired();

      expect(result).toBe(true);
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        '[TokenUtils] Invalid token or missing expiry'
      );
    });

    it('should return true when token has no expiry field', async () => {
      // Create JWT without exp field
      const payload = JSON.stringify({ sub: 'user123', iat: Date.now() / 1000 });
      const base64Payload = Buffer.from(payload).toString('base64');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();

      expect(result).toBe(true);
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        '[TokenUtils] Invalid token or missing expiry'
      );
    });

    it('should return false when token is valid and not expired', async () => {
      // Create JWT that expires in 10 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();

      expect(result).toBe(false);
    });

    it('should return true when token is expired', async () => {
      // Create JWT that expired 5 minutes ago
      const expiresAt = Math.floor(Date.now() / 1000) - 300;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when token expires within buffer time (default 1 minute)', async () => {
      // Create JWT that expires in 30 seconds (within 1 minute buffer)
      const expiresAt = Math.floor(Date.now() / 1000) + 30;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });

    it('should respect custom buffer time', async () => {
      // Create JWT that expires in 3 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 180;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      // With 2 minute buffer, should be valid
      const result1 = await isTokenExpired(2);
      expect(result1).toBe(false);

      // With 5 minute buffer, should be expired
      const result2 = await isTokenExpired(5);
      expect(result2).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (secureStorage.getToken as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await isTokenExpired();

      expect(result).toBe(true);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[TokenUtils] Error checking token expiry:',
        expect.any(Error)
      );
    });

    it('should handle malformed base64 in token', async () => {
      // Token with invalid base64 in payload section
      const token = 'header.!!!invalid-base64!!!.signature';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();

      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('should return null when no token is found', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue(null);

      const result = await getTokenExpiry();

      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue('invalid-token');

      const result = await getTokenExpiry();

      expect(result).toBeNull();
    });

    it('should return null when token has no expiry field', async () => {
      const payload = JSON.stringify({ sub: 'user123' });
      const base64Payload = Buffer.from(payload).toString('base64');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await getTokenExpiry();

      expect(result).toBeNull();
    });

    it('should return correct expiry date for valid token', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await getTokenExpiry();

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(expiresAt * 1000);
    });

    it('should handle errors gracefully', async () => {
      (secureStorage.getToken as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await getTokenExpiry();

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[TokenUtils] Error getting token expiry:',
        expect.any(Error)
      );
    });
  });

  describe('getTokenTimeRemaining', () => {
    it('should return null when no token is found', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue(null);

      const result = await getTokenTimeRemaining();

      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue('invalid-token');

      const result = await getTokenTimeRemaining();

      expect(result).toBeNull();
    });

    it('should return correct minutes remaining for valid token', async () => {
      // Token expires in 10 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await getTokenTimeRemaining();

      // Should be approximately 10 minutes (allow 1 second variance)
      expect(result).toBeGreaterThanOrEqual(9);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should return 0 when token is expired (not negative)', async () => {
      // Token expired 5 minutes ago
      const expiresAt = Math.floor(Date.now() / 1000) - 300;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await getTokenTimeRemaining();

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (secureStorage.getToken as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await getTokenTimeRemaining();

      expect(result).toBeNull();
      // Error is logged from getTokenExpiry, which is called internally
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[TokenUtils] Error getting token expiry:',
        expect.any(Error)
      );
    });

    it('should return correct value for token expiring in less than 1 minute', async () => {
      // Token expires in 30 seconds
      const expiresAt = Math.floor(Date.now() / 1000) + 30;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await getTokenTimeRemaining();

      // Should be 0 minutes (rounds down)
      expect(result).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with special characters in payload', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const payload = JSON.stringify({
        sub: 'user123',
        name: 'Test User <test@example.com>',
        exp: expiresAt,
      });
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();
      expect(result).toBe(false);
    });

    it('should handle token with URL-safe base64 encoding', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      // Use URL-safe base64 (- and _ instead of + and /)
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();
      expect(result).toBe(false);
    });

    it('should handle token without padding', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const payload = JSON.stringify({ sub: 'user123', exp: expiresAt });
      // Remove padding
      const base64Payload = Buffer.from(payload)
        .toString('base64')
        .replace(/[=]/g, '');
      const token = `header.${base64Payload}.signature`;

      (secureStorage.getToken as jest.Mock).mockResolvedValue(token);

      const result = await isTokenExpired();
      expect(result).toBe(false);
    });
  });
});
