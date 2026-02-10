import {
  withAlpha,
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../nbTokens';

describe('nbTokens', () => {
  describe('NB 2.0 token values', () => {
    it('should have updated black color (warm stone)', () => {
      expect(nbColors.black).toBe('#1C1917');
    });

    it('should have updated navy color (dark forest green)', () => {
      expect(nbColors.navy).toBe('#1A4D2E');
    });

    it('should have renamed border values with base instead of default', () => {
      expect(nbBorders.thin).toBe(1);
      expect(nbBorders.base).toBe(2);
      expect(nbBorders.thick).toBe(3);
      expect(nbBorders.extra).toBe(4);
      expect(nbBorders.color).toBe('#1C1917');
    });

    it('should have renamed border radius values with base instead of minimal', () => {
      expect(nbBorderRadius.none).toBe(0);
      expect(nbBorderRadius.sm).toBe(4);
      expect(nbBorderRadius.base).toBe(6);
      expect(nbBorderRadius.md).toBe(8);
      expect(nbBorderRadius.lg).toBe(12);
      expect(nbBorderRadius.full).toBe(9999);
    });

    it('should have soft-edge shadows (NB 2.0)', () => {
      // xs shadow
      expect(nbShadows.xs.shadowOpacity).toBe(0.15);
      expect(nbShadows.xs.shadowRadius).toBe(1);
      expect(nbShadows.xs.shadowOffset.width).toBe(2);

      // sm shadow
      expect(nbShadows.sm.shadowOpacity).toBe(0.18);
      expect(nbShadows.sm.shadowRadius).toBe(2);
      expect(nbShadows.sm.shadowOffset.width).toBe(3);

      // md shadow
      expect(nbShadows.md.shadowOpacity).toBe(0.20);
      expect(nbShadows.md.shadowRadius).toBe(3);

      // lg shadow
      expect(nbShadows.lg.shadowOpacity).toBe(0.22);
      expect(nbShadows.lg.shadowRadius).toBe(4);
    });

    it('should use warm stone black for shadow color', () => {
      expect(nbShadows.sm.shadowColor).toBe('#1C1917');
      expect(nbShadows.md.shadowColor).toBe('#1C1917');
      expect(nbShadows.lg.shadowColor).toBe('#1C1917');
    });
  });


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
