/**
 * Validators Tests
 * Unit tests for input validation utilities
 */

import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isValidCoordinates,
  isValidNotesLength,
  isRequired,
  getValidationError,
  sanitizeString,
} from '../validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should return true for email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should return true for email with numbers', () => {
      expect(isValidEmail('user123@example123.com')).toBe(true);
    });

    it('should return false for email without @', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should return false for email without extension', () => {
      expect(isValidEmail('test@example')).toBe(false);
    });

    it('should return false for email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should return false for multiple @ signs', () => {
      expect(isValidEmail('test@@example.com')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should return true for valid username', () => {
      expect(isValidUsername('worker1')).toBe(true);
    });

    it('should return true for username with minimum length (3)', () => {
      expect(isValidUsername('abc')).toBe(true);
    });

    it('should return true for username with maximum length (50)', () => {
      expect(isValidUsername('a'.repeat(50))).toBe(true);
    });

    it('should return false for username shorter than 3 characters', () => {
      expect(isValidUsername('ab')).toBe(false);
    });

    it('should return false for single character username', () => {
      expect(isValidUsername('a')).toBe(false);
    });

    it('should return false for username longer than 50 characters', () => {
      expect(isValidUsername('a'.repeat(51))).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUsername('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(isValidUsername('   ')).toBe(false);
    });

    it('should return false for undefined/null-like empty string', () => {
      expect(isValidUsername('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid password', () => {
      expect(isValidPassword('password123')).toBe(true);
    });

    it('should return true for password with minimum length (6)', () => {
      expect(isValidPassword('123456')).toBe(true);
    });

    it('should return true for long password', () => {
      expect(isValidPassword('a'.repeat(100))).toBe(true);
    });

    it('should return false for password shorter than 6 characters', () => {
      expect(isValidPassword('12345')).toBe(false);
    });

    it('should return false for empty password', () => {
      expect(isValidPassword('')).toBe(false);
    });

    it('should return false for single character', () => {
      expect(isValidPassword('a')).toBe(false);
    });
  });

  describe('isValidCoordinates', () => {
    it('should return true for valid coordinates (Surabaya)', () => {
      expect(isValidCoordinates(-7.25, 112.75)).toBe(true);
    });

    it('should return true for latitude at 0', () => {
      expect(isValidCoordinates(0, 100)).toBe(true);
    });

    it('should return true for longitude at 0', () => {
      expect(isValidCoordinates(-7, 0)).toBe(true);
    });

    it('should return true for boundary values', () => {
      expect(isValidCoordinates(-90, -180)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
    });

    it('should return true for North Pole', () => {
      expect(isValidCoordinates(90, 0)).toBe(true);
    });

    it('should return true for South Pole', () => {
      expect(isValidCoordinates(-90, 0)).toBe(true);
    });

    it('should return false for latitude below -90', () => {
      expect(isValidCoordinates(-91, 0)).toBe(false);
    });

    it('should return false for latitude above 90', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
    });

    it('should return false for longitude below -180', () => {
      expect(isValidCoordinates(0, -181)).toBe(false);
    });

    it('should return false for longitude above 180', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
    });

    it('should return false for invalid both values', () => {
      expect(isValidCoordinates(100, 200)).toBe(false);
    });
  });

  describe('isValidNotesLength', () => {
    it('should return true for notes within default limit', () => {
      expect(isValidNotesLength('Short note')).toBe(true);
    });

    it('should return true for notes at exactly 500 characters (default)', () => {
      expect(isValidNotesLength('a'.repeat(500))).toBe(true);
    });

    it('should return false for notes exceeding 500 characters (default)', () => {
      expect(isValidNotesLength('a'.repeat(501))).toBe(false);
    });

    it('should return true for empty notes', () => {
      expect(isValidNotesLength('')).toBe(true);
    });

    it('should use custom max length when provided', () => {
      expect(isValidNotesLength('12345', 5)).toBe(true);
      expect(isValidNotesLength('123456', 5)).toBe(false);
    });

    it('should return true for notes at exactly custom limit', () => {
      expect(isValidNotesLength('abcdefghij', 10)).toBe(true);
    });
  });

  describe('isRequired', () => {
    it('should return true for non-empty string', () => {
      expect(isRequired('test')).toBe(true);
    });

    it('should return true for string with content', () => {
      expect(isRequired('hello world')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isRequired('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(isRequired('   ')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRequired(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRequired(undefined)).toBe(false);
    });

    it('should return true for string with leading/trailing spaces but content', () => {
      expect(isRequired('  test  ')).toBe(true);
    });
  });

  describe('getValidationError', () => {
    it('should return required error message', () => {
      expect(getValidationError('Username', 'required')).toBe('Username is required');
    });

    it('should return invalid error message', () => {
      expect(getValidationError('Email', 'invalid')).toBe('Email is invalid');
    });

    it('should return too_short error message', () => {
      expect(getValidationError('Password', 'too_short')).toBe('Password is too short');
    });

    it('should return too_long error message', () => {
      expect(getValidationError('Notes', 'too_long')).toBe('Notes is too long');
    });

    it('should work with different field names', () => {
      expect(getValidationError('Phone Number', 'required')).toBe('Phone Number is required');
      expect(getValidationError('GPS Location', 'invalid')).toBe('GPS Location is invalid');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should trim leading whitespace', () => {
      expect(sanitizeString('   hello')).toBe('hello');
    });

    it('should trim trailing whitespace', () => {
      expect(sanitizeString('hello   ')).toBe('hello');
    });

    it('should preserve internal spaces', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should return empty string for whitespace only', () => {
      expect(sanitizeString('   ')).toBe('');
    });

    it('should return same string if no whitespace', () => {
      expect(sanitizeString('test')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });
});
