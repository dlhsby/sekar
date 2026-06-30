import { normalizePhone, isValidIndonesianMobile, INDO_MOBILE_REGEX } from './phone.util';

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it.each([
      ['+6281234567890', '081234567890'],
      ['6281234567890', '081234567890'],
      ['081234567890', '081234567890'],
      ['81234567890', '081234567890'],
      ['+62 812-3456-7890', '081234567890'],
      ['0812 3456 7890', '081234567890'],
    ])('normalizes %s → %s', (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });

    it('returns empty string for null/undefined', () => {
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
    });
  });

  describe('isValidIndonesianMobile', () => {
    it('accepts valid local + international spellings', () => {
      expect(isValidIndonesianMobile('081234567890')).toBe(true);
      expect(isValidIndonesianMobile('+6281234567890')).toBe(true);
    });

    it('rejects too short / non-08 numbers', () => {
      expect(isValidIndonesianMobile('0812')).toBe(false);
      expect(isValidIndonesianMobile('071234567890')).toBe(false);
      expect(isValidIndonesianMobile('')).toBe(false);
    });
  });

  it('regex enforces 08 + 8..12 digits', () => {
    expect(INDO_MOBILE_REGEX.test('0812345678')).toBe(true); // 10
    expect(INDO_MOBILE_REGEX.test('081234567890123')).toBe(false); // 15 too long
  });
});
