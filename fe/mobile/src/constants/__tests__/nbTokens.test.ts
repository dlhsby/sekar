import { withAlpha } from '../nbTokens';

describe('nbTokens', () => {
  describe('withAlpha', () => {
    it('should convert 6-digit hex to rgba', () => {
      expect(withAlpha('#7FBC8C', 0.5)).toBe('rgba(127, 188, 140, 0.5)');
      expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
      expect(withAlpha('#FFFFFF', 0)).toBe('rgba(255, 255, 255, 0)');
    });

    it('should convert 3-digit hex to rgba', () => {
      expect(withAlpha('#FFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(withAlpha('#000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
      expect(withAlpha('#F00', 0.3)).toBe('rgba(255, 0, 0, 0.3)');
    });

    it('should handle hex without hash symbol', () => {
      expect(withAlpha('7FBC8C', 0.5)).toBe('rgba(127, 188, 140, 0.5)');
      expect(withAlpha('FFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('should clamp alpha to 0-1 range', () => {
      expect(withAlpha('#000000', -0.5)).toBe('rgba(0, 0, 0, 0)');
      expect(withAlpha('#000000', 1.5)).toBe('rgba(0, 0, 0, 1)');
      expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle invalid hex gracefully', () => {
      expect(withAlpha('#XYZ', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
      expect(withAlpha('#12', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
      expect(withAlpha('#1234567', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
      expect(withAlpha('invalid', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('should handle lowercase and uppercase hex', () => {
      expect(withAlpha('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
      expect(withAlpha('#ABC', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
      expect(withAlpha('#AbCdEf', 0.5)).toBe('rgba(171, 205, 239, 0.5)');
    });
  });
});
