/* eslint-disable sekar-design/no-inline-hex-colors -- hex literals are the test fixtures */
import { readableInk, isHexColor } from '../color';

describe('color utils', () => {
  describe('isHexColor', () => {
    it('accepts a 6-digit hex', () => {
      expect(isHexColor('#7FBC8C')).toBe(true);
      expect(isHexColor('#abcdef')).toBe(true);
    });
    it('rejects invalid / partial / empty values', () => {
      expect(isHexColor('#FFF')).toBe(false);
      expect(isHexColor('7FBC8C')).toBe(false);
      expect(isHexColor('rgb(0,0,0)')).toBe(false);
      expect(isHexColor(null)).toBe(false);
      expect(isHexColor(undefined)).toBe(false);
    });
  });

  describe('readableInk', () => {
    it('uses white ink on a dark background', () => {
      expect(readableInk('#1C1917')).toBe('var(--color-nb-white)');
      expect(readableInk('#2563EB')).toBe('var(--color-nb-white)');
    });
    it('uses black ink on a light background', () => {
      expect(readableInk('#FDFD96')).toBe('var(--color-nb-black)');
      expect(readableInk('#7FBC8C')).toBe('var(--color-nb-black)');
    });
    it('falls back to black ink for an invalid colour', () => {
      expect(readableInk(undefined)).toBe('var(--color-nb-black)');
      expect(readableInk('nope')).toBe('var(--color-nb-black)');
    });
  });
});
