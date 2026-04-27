import {
  withAlpha,
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../nbTokens';

describe('nbTokens', () => {
  describe('NB 2.0 token values (Phase 3 M1-R canonical)', () => {
    it('should have updated black color (warm stone)', () => {
      expect(nbColors.black).toBe('#1C1917');
    });

    it('should have updated navy color (dark forest green)', () => {
      expect(nbColors.navy).toBe('#1A4D2E');
    });

    it('should have border width values with widthBase naming (generated)', () => {
      expect(nbBorders.widthThin).toBe(1);
      expect(nbBorders.widthBase).toBe(2);
      expect(nbBorders.widthThick).toBe(3);
      expect(nbBorders.widthExtra).toBe(4);
      expect(nbBorders.color).toBe('#1C1917');
    });

    it('should expose backward-compat border aliases for Phase 2 call sites', () => {
      expect(nbBorders.thin).toBe(1);
      expect(nbBorders.base).toBe(2);
      expect(nbBorders.thick).toBe(3);
      expect(nbBorders.extra).toBe(4);
    });

    it('should expose nbColors.background alias for Phase 2 call sites', () => {
      expect(nbColors.background).toBe('#F5F0EB');
      expect(nbColors.bgCanvas).toBe('#F5F0EB');
    });

    it('should have border radius values (via nbBorderRadius alias)', () => {
      expect(nbBorderRadius.none).toBe(0);
      expect(nbBorderRadius.sm).toBe(4);
      expect(nbBorderRadius.base).toBe(6);
      expect(nbBorderRadius.md).toBe(8);
      expect(nbBorderRadius.lg).toBe(12);
      expect(nbBorderRadius.full).toBe(9999);
    });

    it('should have hard-edge shadows (NB stamp: zero blur, opaque — 3-R2 lock)', () => {
      // xs shadow — 2px offset, no blur, opaque
      expect(nbShadows.xs.shadowOpacity).toBe(1);
      expect(nbShadows.xs.shadowRadius).toBe(0);
      expect(nbShadows.xs.shadowOffset?.width).toBe(2);
      expect(nbShadows.xs.shadowOffset?.height).toBe(2);

      // sm shadow — 4px offset
      expect(nbShadows.sm.shadowOpacity).toBe(1);
      expect(nbShadows.sm.shadowRadius).toBe(0);
      expect(nbShadows.sm.shadowOffset?.width).toBe(4);

      // md shadow — 6px offset
      expect(nbShadows.md.shadowOpacity).toBe(1);
      expect(nbShadows.md.shadowRadius).toBe(0);
      expect(nbShadows.md.shadowOffset?.width).toBe(6);

      // lg shadow — 8px offset
      expect(nbShadows.lg.shadowOpacity).toBe(1);
      expect(nbShadows.lg.shadowRadius).toBe(0);
      expect(nbShadows.lg.shadowOffset?.width).toBe(8);
    });

    it('should use warm stone black for shadow color', () => {
      expect(nbShadows.sm.shadowColor).toBe('#1C1917');
      expect(nbShadows.md.shadowColor).toBe('#1C1917');
      expect(nbShadows.lg.shadowColor).toBe('#1C1917');
    });

    it('should expose nested gray for backward compat (Phase 2 call sites)', () => {
      expect(nbColors.gray['50']).toBe('#FAFAF9');
      expect(nbColors.gray['200']).toBe('#E7E5E4');
      expect(nbColors.gray['500']).toBe('#78716C');
      expect(nbColors.gray['900']).toBe('#1C1917');
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

  describe('flat-token shape regression guard (Phase 3)', () => {
    // SubmitScreen + KecamatanNavigator crashed on Apr 27 because of nested
    // paths like nbColors.bg.primary / nbColors.text.secondary that don't
    // exist on the generated flat export. This guard fails fast if any
    // future contributor reintroduces a nested object on the affected keys.
    it('should not expose nested objects on bg/text/status (flat shape only)', () => {
      const c = nbColors as unknown as Record<string, unknown>;
      const nestedKeys = ['bg', 'text', 'status'];
      nestedKeys.forEach((k) => {
        // Either the key is absent, or it's a string color — never an object.
        if (k in c) {
          expect(typeof c[k]).toBe('string');
        }
      });
    });

    it('should expose canonical flat color names used across Phase 3 screens', () => {
      const required = [
        'bgCanvas',
        'bgSurface',
        'black',
        'white',
        'gray300',
        'gray500',
        'gray600',
        'primary',
        'danger',
        'success',
      ];
      required.forEach((key) => {
        expect(typeof (nbColors as unknown as Record<string, unknown>)[key]).toBe(
          'string',
        );
      });
    });

    it('should not expose semantic aliases that previously crashed at runtime', () => {
      const c = nbColors as unknown as Record<string, unknown>;
      const forbidden = [
        'bgDefault',
        'bgSecondary',
        'bgTertiary',
        'textDefault',
        'textSecondary',
        'textTertiary',
        'borderDefault',
      ];
      forbidden.forEach((key) => {
        // If we ever decide to add these as proper aliases, update the
        // mapping table in screens/pruningRequests at the same time.
        expect(c[key]).toBeUndefined();
      });
    });
  });
});
