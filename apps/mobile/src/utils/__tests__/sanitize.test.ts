/**
 * Input Sanitization Tests
 * Comprehensive tests for input sanitization utilities
 */

import {
  sanitizeText,
  sanitizeMultilineText,
  sanitizeFilename,
  sanitizeGpsCoordinates,
  sanitizeUsername,
} from '../sanitize';

describe('sanitizeText', () => {
  describe('XSS prevention', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeText(input)).toBe('Hello  World');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <div>World</div>';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should remove nested HTML tags', () => {
      const input = '<div><span>Test</span></div>';
      expect(sanitizeText(input)).toBe('Test');
    });

    it('should remove script tags with attributes', () => {
      const input = '<script src="malicious.js">alert("xss")</script>';
      expect(sanitizeText(input)).toBe('');
    });

    it('should remove multiple script tags', () => {
      const input = '<script>alert(1)</script>Text<script>alert(2)</script>';
      expect(sanitizeText(input)).toBe('Text');
    });
  });

  describe('control character removal', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00\x01\x02World';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });

    it('should preserve newline, tab, and carriage return', () => {
      const input = 'Hello\nWorld\tTest\r';
      expect(sanitizeText(input)).toBe('Hello\nWorld\tTest');
    });

    it('should remove zero-width characters', () => {
      const input = 'Hello\u200BWorld\u200C';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });

    it('should remove FEFF (zero-width no-break space)', () => {
      const input = 'Hello\uFEFFWorld';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });
  });

  describe('whitespace handling', () => {
    it('should trim leading whitespace', () => {
      const input = '   Hello World';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should trim trailing whitespace', () => {
      const input = 'Hello World   ';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should trim both leading and trailing whitespace', () => {
      const input = '   Hello World   ';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should preserve internal whitespace', () => {
      const input = 'Hello    World';
      expect(sanitizeText(input)).toBe('Hello    World');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeText(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeText(123 as any)).toBe('');
      expect(sanitizeText({} as any)).toBe('');
      expect(sanitizeText([] as any)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should handle input with only whitespace', () => {
      expect(sanitizeText('   ')).toBe('');
    });

    it('should handle valid plain text', () => {
      const input = 'Hello World! This is a valid text.';
      expect(sanitizeText(input)).toBe(input);
    });

    it('should handle Indonesian text', () => {
      const input = 'Laporan kebersihan taman';
      expect(sanitizeText(input)).toBe(input);
    });

    it('should handle special characters', () => {
      const input = 'Test @#$%^&*()_+-=';
      expect(sanitizeText(input)).toBe(input);
    });
  });
});

describe('sanitizeMultilineText', () => {
  it('should preserve newlines in multiline text', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    expect(sanitizeMultilineText(input)).toBe(input);
  });

  it('should sanitize each line independently', () => {
    const input = 'Line 1 <script>alert()</script>\nLine 2 <div>test</div>';
    expect(sanitizeMultilineText(input)).toBe('Line 1\nLine 2 test');
  });

  it('should trim overall whitespace', () => {
    const input = '\nLine 1\nLine 2\n';
    expect(sanitizeMultilineText(input)).toBe('Line 1\nLine 2');
  });

  it('should handle empty lines', () => {
    const input = 'Line 1\n\nLine 2';
    expect(sanitizeMultilineText(input)).toBe('Line 1\n\nLine 2');
  });

  it('should return empty string for null input', () => {
    expect(sanitizeMultilineText(null as any)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(sanitizeMultilineText(undefined as any)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeMultilineText(123 as any)).toBe('');
  });

  it('should handle single line text', () => {
    const input = 'Single line';
    expect(sanitizeMultilineText(input)).toBe(input);
  });

  it('should remove HTML from multiline report', () => {
    const input = 'Laporan:\n<script>alert()</script>\nSelesai';
    expect(sanitizeMultilineText(input)).toBe('Laporan:\n\nSelesai');
  });
});

describe('sanitizeFilename', () => {
  describe('security', () => {
    it('should remove directory traversal attempts', () => {
      const input = '../../../etc/passwd';
      expect(sanitizeFilename(input)).toBe('etcpasswd');
    });

    it('should remove path separators', () => {
      const input = 'path/to/file.txt';
      expect(sanitizeFilename(input)).toBe('pathtofile.txt');
    });

    it('should remove backslash separators', () => {
      const input = 'path\\to\\file.txt';
      expect(sanitizeFilename(input)).toBe('pathtofile.txt');
    });
  });

  describe('special character handling', () => {
    it('should allow dots, dashes, and underscores', () => {
      const input = 'my-file_name.txt';
      expect(sanitizeFilename(input)).toBe(input);
    });

    it('should replace spaces with underscores', () => {
      const input = 'my file name.txt';
      expect(sanitizeFilename(input)).toBe('my_file_name.txt');
    });

    it('should replace special characters with underscores', () => {
      const input = 'file@#$%name.txt';
      expect(sanitizeFilename(input)).toBe('file____name.txt');
    });

    it('should allow alphanumeric characters', () => {
      const input = 'file123ABC.txt';
      expect(sanitizeFilename(input)).toBe(input);
    });
  });

  describe('length limits', () => {
    it('should truncate long filenames to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should preserve file extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const result = sanitizeFilename(longName);
      expect(result).toMatch(/\.jpg$/);
    });

    it('should handle filenames without extension when truncating', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('edge cases', () => {
    it('should return "unnamed" for null input', () => {
      expect(sanitizeFilename(null as any)).toBe('unnamed');
    });

    it('should return "unnamed" for undefined input', () => {
      expect(sanitizeFilename(undefined as any)).toBe('unnamed');
    });

    it('should return "unnamed" for empty string', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
    });

    it('should return "unnamed" for non-string input', () => {
      expect(sanitizeFilename(123 as any)).toBe('unnamed');
    });

    it('should return "unnamed" for filename with only special characters', () => {
      expect(sanitizeFilename('!@#$%^&*()')).toBe('__________');
    });

    it('should handle typical photo filenames', () => {
      expect(sanitizeFilename('photo_2026-01-22.jpg')).toBe('photo_2026-01-22.jpg');
    });

    it('should handle report photo filenames', () => {
      expect(sanitizeFilename('report_123_photo_1.jpg')).toBe('report_123_photo_1.jpg');
    });
  });
});

describe('sanitizeGpsCoordinates', () => {
  describe('valid coordinates', () => {
    it('should accept valid latitude and longitude as numbers', () => {
      const result = sanitizeGpsCoordinates(-7.265, 112.734);
      expect(result).toEqual({ lat: -7.265, lng: 112.734 });
    });

    it('should accept valid coordinates as strings', () => {
      const result = sanitizeGpsCoordinates('-7.265', '112.734');
      expect(result).toEqual({ lat: -7.265, lng: 112.734 });
    });

    it('should accept coordinates at boundaries', () => {
      expect(sanitizeGpsCoordinates(90, 180)).toEqual({ lat: 90, lng: 180 });
      expect(sanitizeGpsCoordinates(-90, -180)).toEqual({ lat: -90, lng: -180 });
    });

    it('should accept zero coordinates', () => {
      const result = sanitizeGpsCoordinates(0, 0);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should accept Surabaya coordinates', () => {
      const result = sanitizeGpsCoordinates(-7.257472, 112.752090);
      expect(result).toEqual({ lat: -7.257472, lng: 112.752090 });
    });
  });

  describe('invalid coordinates', () => {
    it('should return null for latitude > 90', () => {
      expect(sanitizeGpsCoordinates(91, 112.734)).toBeNull();
    });

    it('should return null for latitude < -90', () => {
      expect(sanitizeGpsCoordinates(-91, 112.734)).toBeNull();
    });

    it('should return null for longitude > 180', () => {
      expect(sanitizeGpsCoordinates(-7.265, 181)).toBeNull();
    });

    it('should return null for longitude < -180', () => {
      expect(sanitizeGpsCoordinates(-7.265, -181)).toBeNull();
    });

    it('should return null for NaN latitude', () => {
      expect(sanitizeGpsCoordinates(NaN, 112.734)).toBeNull();
    });

    it('should return null for NaN longitude', () => {
      expect(sanitizeGpsCoordinates(-7.265, NaN)).toBeNull();
    });

    it('should return null for invalid string latitude', () => {
      expect(sanitizeGpsCoordinates('invalid', '112.734')).toBeNull();
    });

    it('should return null for invalid string longitude', () => {
      expect(sanitizeGpsCoordinates('-7.265', 'invalid')).toBeNull();
    });

    it('should return null for both invalid', () => {
      expect(sanitizeGpsCoordinates('invalid', 'invalid')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle string with leading/trailing spaces', () => {
      const result = sanitizeGpsCoordinates(' -7.265 ', ' 112.734 ');
      expect(result).toEqual({ lat: -7.265, lng: 112.734 });
    });

    it('should handle exponential notation', () => {
      const result = sanitizeGpsCoordinates(-7.265e0, 1.12734e2);
      expect(result).toEqual({ lat: -7.265, lng: 112.734 });
    });

    it('should handle string exponential notation', () => {
      const result = sanitizeGpsCoordinates('-7.265e0', '1.12734e2');
      expect(result).toEqual({ lat: -7.265, lng: 112.734 });
    });
  });
});

describe('sanitizeUsername', () => {
  describe('valid usernames', () => {
    it('should accept alphanumeric username', () => {
      expect(sanitizeUsername('user123')).toBe('user123');
    });

    it('should accept username with underscores', () => {
      expect(sanitizeUsername('user_name_123')).toBe('user_name_123');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeUsername('UserName123')).toBe('username123');
    });
  });

  describe('sanitization', () => {
    it('should remove spaces', () => {
      expect(sanitizeUsername('user name')).toBe('username');
    });

    it('should remove special characters', () => {
      expect(sanitizeUsername('user@name#123')).toBe('username123');
    });

    it('should remove dashes', () => {
      expect(sanitizeUsername('user-name')).toBe('username');
    });

    it('should remove dots', () => {
      expect(sanitizeUsername('user.name')).toBe('username');
    });

    it('should remove emoji', () => {
      expect(sanitizeUsername('user😊name')).toBe('username');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeUsername(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitizeUsername(undefined as any)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(sanitizeUsername('')).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeUsername(123 as any)).toBe('');
    });

    it('should return empty string for username with only special characters', () => {
      expect(sanitizeUsername('!@#$%^')).toBe('');
    });

    it('should handle typical worker usernames', () => {
      expect(sanitizeUsername('worker1')).toBe('worker1');
      expect(sanitizeUsername('supervisor_1')).toBe('supervisor_1');
    });
  });
});
