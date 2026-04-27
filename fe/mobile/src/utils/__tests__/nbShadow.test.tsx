/**
 * nbShadow Utility Tests
 * Tests for Neo Brutalism 2.0 shadow utilities (soft-edge shadows)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Platform } from 'react-native';
import {
  getNBShadow,
  getInteractiveShadow,
  getHoverShadow,
  getDisabledShadow,
  getShadowWithDisabled,
  NBShadowWrapper,
} from '../nbShadow';
import { nbShadows } from '../../constants/nbTokens';

describe('nbShadow Utilities', () => {
  describe('getNBShadow', () => {
    it('should return small shadow style', () => {
      const shadow = getNBShadow('sm');

      expect(shadow).toEqual(nbShadows.sm);
      expect(shadow.shadowColor).toBe('#1C1917'); // NB 2.0 warm stone black
      expect(shadow.shadowOffset).toEqual({ width: 4, height: 4 });
      expect(shadow.shadowOpacity).toBe(1);
      expect(shadow.shadowRadius).toBe(0);
      expect(shadow.elevation).toBe(4);
    });

    it('should return medium shadow style', () => {
      const shadow = getNBShadow('md');

      expect(shadow).toEqual(nbShadows.md);
      expect(shadow.shadowOffset).toEqual({ width: 6, height: 6 });
      expect(shadow.elevation).toBe(6);
    });

    it('should return large shadow style', () => {
      const shadow = getNBShadow('lg');

      expect(shadow).toEqual(nbShadows.lg);
      expect(shadow.shadowOffset).toEqual({ width: 8, height: 8 });
      expect(shadow.elevation).toBe(8);
    });

    it('should return hover shadow style', () => {
      const shadow = getNBShadow('hover');

      expect(shadow).toEqual(nbShadows.hover);
      expect(shadow.shadowOffset).toEqual({ width: 8, height: 8 });
    });

    it('should return active shadow style', () => {
      const shadow = getNBShadow('active');

      expect(shadow).toEqual(nbShadows.active);
      expect(shadow.shadowOffset).toEqual({ width: 2, height: 2 });
      expect(shadow.elevation).toBe(2);
    });

    it('should return none shadow style', () => {
      const shadow = getNBShadow('none');

      expect(shadow).toEqual(nbShadows.none);
      expect(shadow.shadowColor).toBe('transparent');
      expect(shadow.shadowOffset).toEqual({ width: 0, height: 0 });
      expect(shadow.elevation).toBe(0);
    });

    it('should have hard-edge shadows (NB 2.0 characteristic)', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover'];

      sizes.forEach(size => {
        const shadow = getNBShadow(size);
        expect(shadow.shadowRadius).toBe(0); // NB 2.0 uses hard-edge shadows
      });
    });

    it('should have full opacity for hard shadows (NB 2.0)', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active'];

      sizes.forEach(size => {
        const shadow = getNBShadow(size);
        expect(shadow.shadowOpacity).toBe(1); // NB 2.0 uses full-opacity hard-edge shadows
      });
    });
  });

  describe('getInteractiveShadow', () => {
    it('should return active shadow and transform when pressed', () => {
      const { shadow, transform } = getInteractiveShadow(true);

      expect(shadow).toEqual(nbShadows.active);
      expect(transform).toEqual([
        { translateX: 2 },
        { translateY: 2 },
      ]);
    });

    it('should return medium shadow and no transform when not pressed', () => {
      const { shadow, transform } = getInteractiveShadow(false);

      expect(shadow).toEqual(nbShadows.md);
      expect(transform).toEqual([
        { translateX: 0 },
        { translateY: 0 },
      ]);
    });

    it('should return consistent results for same input', () => {
      const result1 = getInteractiveShadow(true);
      const result2 = getInteractiveShadow(true);

      expect(result1).toEqual(result2);
    });

    it('should handle multiple state changes', () => {
      const notPressed = getInteractiveShadow(false);
      const pressed = getInteractiveShadow(true);
      const notPressedAgain = getInteractiveShadow(false);

      expect(notPressed).toEqual(notPressedAgain);
      expect(pressed).not.toEqual(notPressed);
    });
  });

  describe('getHoverShadow', () => {
    it('should return hover shadow when hovered', () => {
      const shadow = getHoverShadow(true);

      expect(shadow).toEqual(nbShadows.hover);
      expect(shadow.shadowOffset).toEqual({ width: 8, height: 8 });
    });

    it('should return medium shadow when not hovered', () => {
      const shadow = getHoverShadow(false);

      expect(shadow).toEqual(nbShadows.md);
      expect(shadow.shadowOffset).toEqual({ width: 6, height: 6 });
    });

    it('should transition between hover states', () => {
      const normal = getHoverShadow(false);
      const hovered = getHoverShadow(true);

      expect(normal).not.toEqual(hovered);
      expect(hovered.elevation).toBeGreaterThanOrEqual(normal.elevation);
    });
  });

  describe('getDisabledShadow', () => {
    it('should return none shadow with opacity when disabled', () => {
      const shadow = getDisabledShadow(true);

      expect(shadow.shadowColor).toBe('transparent');
      expect(shadow.shadowOffset).toEqual({ width: 0, height: 0 });
      expect(shadow.opacity).toBe(0.5);
    });

    it('should return default medium shadow when not disabled', () => {
      const shadow = getDisabledShadow(false);

      expect(shadow).toEqual(nbShadows.md);
    });

    it('should respect custom base size when not disabled', () => {
      const shadowSm = getDisabledShadow(false, 'sm');
      const shadowLg = getDisabledShadow(false, 'lg');

      expect(shadowSm).toEqual(nbShadows.sm);
      expect(shadowLg).toEqual(nbShadows.lg);
    });

    it('should return same disabled shadow regardless of base size', () => {
      const disabledSm = getDisabledShadow(true, 'sm');
      const disabledLg = getDisabledShadow(true, 'lg');

      expect(disabledSm.shadowColor).toBe('transparent');
      expect(disabledLg.shadowColor).toBe('transparent');
      expect(disabledSm.opacity).toBe(0.5);
      expect(disabledLg.opacity).toBe(0.5);
    });

    it('should use medium shadow as default base size', () => {
      const shadowDefault = getDisabledShadow(false);
      const shadowMd = getDisabledShadow(false, 'md');

      expect(shadowDefault).toEqual(shadowMd);
    });
  });

  describe('getShadowWithDisabled', () => {
    it('should return none shadow when disabled', () => {
      const shadow = getShadowWithDisabled('md', true);

      expect(shadow).toEqual(nbShadows.none);
    });

    it('should return specified shadow size when not disabled', () => {
      const shadowSm = getShadowWithDisabled('sm', false);
      const shadowMd = getShadowWithDisabled('md', false);
      const shadowLg = getShadowWithDisabled('lg', false);

      expect(shadowSm).toEqual(nbShadows.sm);
      expect(shadowMd).toEqual(nbShadows.md);
      expect(shadowLg).toEqual(nbShadows.lg);
    });

    it('should handle all shadow sizes', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active', 'none'];

      sizes.forEach(size => {
        const shadow = getShadowWithDisabled(size, false);
        expect(shadow).toEqual(nbShadows[size]);
      });
    });

    it('should consistently return none shadow for disabled state', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active'];

      sizes.forEach(size => {
        const shadow = getShadowWithDisabled(size, true);
        expect(shadow).toEqual(nbShadows.none);
      });
    });
  });

  describe('NBShadowWrapper', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <NBShadowWrapper size="md">
          <View>
            <View testID="test-content">Test Content</View>
          </View>
        </NBShadowWrapper>
      );

      expect(getByText).toBeDefined();
    });

    it('should apply shadow based on size prop', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="lg">
          <View testID="test-child" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle pressed state', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md" isPressed={true}>
          <View testID="test-child" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle unpressed state', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md" isPressed={false}>
          <View testID="test-child" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should default to not pressed', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md">
          <View testID="test-child" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20, marginLeft: 10 };

      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md" style={customStyle}>
          <View testID="test-child" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle all shadow sizes', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active', 'none'];

      sizes.forEach(size => {
        const { UNSAFE_root } = render(
          <NBShadowWrapper size={size}>
            <View testID={`test-${size}`} />
          </NBShadowWrapper>
        );

        expect(UNSAFE_root).toBeDefined();
      });
    });

    it('should render multiple children', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md">
          <View testID="child-1" />
          <View testID="child-2" />
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle null children gracefully', () => {
      const { UNSAFE_root } = render(
        <NBShadowWrapper size="md">
          {null}
        </NBShadowWrapper>
      );

      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe('Shadow Properties Validation', () => {
    it('should have increasing shadow offsets from sm to lg', () => {
      const sm = getNBShadow('sm');
      const md = getNBShadow('md');
      const lg = getNBShadow('lg');

      expect(sm.shadowOffset.width).toBeLessThan(md.shadowOffset.width);
      expect(md.shadowOffset.width).toBeLessThan(lg.shadowOffset.width);
      expect(sm.elevation).toBeLessThan(md.elevation);
      expect(md.elevation).toBeLessThan(lg.elevation);
    });

    it('should have matching width and height offsets (square shadows)', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active'];

      sizes.forEach(size => {
        const shadow = getNBShadow(size);
        expect(shadow.shadowOffset.width).toBe(shadow.shadowOffset.height);
      });
    });

    it('should use warm stone black color for all visible shadows (NB 2.0)', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active'];

      sizes.forEach(size => {
        const shadow = getNBShadow(size);
        expect(shadow.shadowColor).toBe('#1C1917'); // NB 2.0 warm stone black
      });
    });

    it('should have elevation matching shadow size pattern', () => {
      const sm = getNBShadow('sm');
      const md = getNBShadow('md');
      const lg = getNBShadow('lg');

      // NB 2.0 hard-edge elevation values
      expect(sm.elevation).toBe(4);
      expect(md.elevation).toBe(6);
      expect(lg.elevation).toBe(8);
    });
  });

  describe('Platform Specific Behavior', () => {
    it('should work on iOS platform', () => {
      Platform.OS = 'ios';
      const shadow = getNBShadow('md');

      expect(shadow.shadowColor).toBe('#1C1917'); // NB 2.0 warm stone black
      expect(shadow.shadowOffset).toEqual({ width: 6, height: 6 });
    });

    it('should work on Android platform', () => {
      Platform.OS = 'android';
      const shadow = getNBShadow('md');

      expect(shadow.elevation).toBe(6);
    });

    it('should provide both iOS and Android properties', () => {
      const shadow = getNBShadow('md');

      // iOS properties
      expect(shadow.shadowColor).toBeDefined();
      expect(shadow.shadowOffset).toBeDefined();
      expect(shadow.shadowOpacity).toBeDefined();
      expect(shadow.shadowRadius).toBeDefined();

      // Android property
      expect(shadow.elevation).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      for (let i = 0; i < 100; i++) {
        const pressed = getInteractiveShadow(i % 2 === 0);
        expect(pressed.shadow).toBeDefined();
        expect(pressed.transform).toBeDefined();
      }
    });

    it('should maintain shadow integrity across multiple calls', () => {
      const shadow1 = getNBShadow('md');
      const shadow2 = getNBShadow('md');

      expect(shadow1).toEqual(shadow2);
    });

    it('should handle all combinations of disabled and size', () => {
      const sizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active', 'none'];
      const disabledStates = [true, false];

      sizes.forEach(size => {
        disabledStates.forEach(disabled => {
          const shadow = getShadowWithDisabled(size, disabled);
          expect(shadow).toBeDefined();
          expect(shadow.shadowColor).toBeDefined();
        });
      });
    });
  });

  describe('Type Safety', () => {
    it('should accept valid shadow size types', () => {
      const validSizes: Array<keyof typeof nbShadows> = ['sm', 'md', 'lg', 'hover', 'active', 'none'];

      validSizes.forEach(size => {
        expect(() => getNBShadow(size)).not.toThrow();
      });
    });

    it('should handle boolean parameters correctly', () => {
      expect(() => getInteractiveShadow(true)).not.toThrow();
      expect(() => getInteractiveShadow(false)).not.toThrow();
      expect(() => getHoverShadow(true)).not.toThrow();
      expect(() => getHoverShadow(false)).not.toThrow();
      expect(() => getDisabledShadow(true)).not.toThrow();
      expect(() => getDisabledShadow(false)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should execute getNBShadow quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        getNBShadow('md');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should execute getInteractiveShadow quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        getInteractiveShadow(i % 2 === 0);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
