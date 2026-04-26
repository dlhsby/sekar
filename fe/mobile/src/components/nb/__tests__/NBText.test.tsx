import React from 'react';
import { render } from '@testing-library/react-native';
import { NBText, NBHeading1, NBHeading2, NBHeading3 } from '../NBText';

describe('NBText', () => {
  describe('rendering', () => {
    it('renders children', () => {
      const { getByText } = render(<NBText>Hello</NBText>);
      expect(getByText('Hello')).toBeTruthy();
    });

    it('renders with default body variant', () => {
      const { getByText } = render(<NBText>Default</NBText>);
      const el = getByText('Default');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 16, fontWeight: '400' }),
        ]),
      );
    });
  });

  describe('variants map to correct type scale', () => {
    const variantCases: Array<[import('../NBText').NBTextVariant, number, string]> = [
      ['display-xl', 56, '800'],
      ['display', 40, '700'],
      ['h1', 28, '700'],
      ['h2', 22, '600'],
      ['h3', 18, '600'],
      ['body-lg', 18, '500'],
      ['body', 16, '400'],
      ['body-sm', 14, '400'],
      ['caption', 12, '500'],
      ['mono-sm', 12, '500'],
    ];

    test.each(variantCases)('%s → fontSize=%i fontWeight=%s', (variant, fontSize, fontWeight) => {
      const { getByText } = render(
        <NBText variant={variant}>Text</NBText>,
      );
      const el = getByText('Text');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ fontSize, fontWeight }),
        ]),
      );
    });
  });

  describe('font family', () => {
    it('heading variants use Space Grotesk', () => {
      const { getByText } = render(<NBText variant="h1">Heading</NBText>);
      const el = getByText('Heading');
      const styleArr = el.props.style as object[];
      const computed = styleArr.find((s: any) => s.fontFamily);
      expect((computed as any).fontFamily).toBe('Space Grotesk');
    });

    it('body variants use Inter', () => {
      const { getByText } = render(<NBText variant="body">Body</NBText>);
      const el = getByText('Body');
      const styleArr = el.props.style as object[];
      const computed = styleArr.find((s: any) => s.fontFamily);
      expect((computed as any).fontFamily).toBe('Inter');
    });

    it('mono-sm uses JetBrains Mono', () => {
      const { getByText } = render(<NBText variant="mono-sm">Mono</NBText>);
      const el = getByText('Mono');
      const styleArr = el.props.style as object[];
      const computed = styleArr.find((s: any) => s.fontFamily);
      expect((computed as any).fontFamily).toBe('JetBrains Mono');
    });
  });

  describe('props', () => {
    it('applies uppercase transform when uppercase=true', () => {
      const { getByText } = render(
        <NBText uppercase>text</NBText>,
      );
      const el = getByText('text');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ textTransform: 'uppercase' }),
        ]),
      );
    });

    it('applies textAlign center', () => {
      const { getByText } = render(
        <NBText align="center">Center</NBText>,
      );
      const el = getByText('Center');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' }),
        ]),
      );
    });

    it('merges custom style', () => {
      const { getByText } = render(
        <NBText style={{ opacity: 0.5 }}>Custom</NBText>,
      );
      const el = getByText('Custom');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([expect.objectContaining({ opacity: 0.5 })]),
      );
    });

    it('sets accessibilityRole=header for h* variants', () => {
      const { getByText } = render(<NBText variant="h2">Heading</NBText>);
      expect(getByText('Heading').props.accessibilityRole).toBe('header');
    });

    it('sets accessibilityRole=text for body variants', () => {
      const { getByText } = render(<NBText variant="body">Body</NBText>);
      expect(getByText('Body').props.accessibilityRole).toBe('text');
    });
  });

  describe('convenience components', () => {
    it('NBHeading1 renders with h1 variant', () => {
      const { getByText } = render(<NBHeading1>H1</NBHeading1>);
      const el = getByText('H1');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([expect.objectContaining({ fontSize: 28 })]),
      );
    });

    it('NBHeading2 renders with h2 variant', () => {
      const { getByText } = render(<NBHeading2>H2</NBHeading2>);
      const el = getByText('H2');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([expect.objectContaining({ fontSize: 22 })]),
      );
    });

    it('NBHeading3 renders with h3 variant', () => {
      const { getByText } = render(<NBHeading3>H3</NBHeading3>);
      const el = getByText('H3');
      expect(el.props.style).toMatchObject(
        expect.arrayContaining([expect.objectContaining({ fontSize: 18 })]),
      );
    });
  });
});
