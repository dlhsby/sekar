import React from 'react';
import { Text, type TextStyle, type TextProps } from 'react-native';
import { nbType, nbColors } from '../../constants/nbTokens';

export type NBTextVariant =
  | 'display-xl'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'mono-sm';

type StringValuedKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];
export type NBTextColor = StringValuedKeys<typeof nbColors>;
export type NBTextAlign = 'left' | 'center' | 'right';

export interface NBTextProps extends TextProps {
  variant?: NBTextVariant;
  color?: NBTextColor;
  align?: NBTextAlign;
  uppercase?: boolean;
  style?: TextStyle;
  children: React.ReactNode;
}

// Variants that map to the 'header' accessibility role. Includes the two
// large display variants (56px/40px) in addition to h1/h2/h3.
const HEADING_VARIANTS = new Set<NBTextVariant>([
  'display-xl',
  'display',
  'h1',
  'h2',
  'h3',
]);

// Maps spec variant name → generated nbType key
const variantKey: Record<NBTextVariant, keyof typeof nbType> = {
  'display-xl': 'displayXl',
  display: 'display',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  'body-lg': 'bodyLg',
  body: 'body',
  'body-sm': 'bodySm',
  caption: 'caption',
  'mono-sm': 'monoSm',
};

// Strip CSS font-family stack to RN-compatible name: "'Inter', sans-serif" → "Inter"
function rnFontFamily(cssFontStack: string): string {
  const match = cssFontStack.match(/['"]?([^'",]+)['"]?/);
  return match?.[1]?.trim() ?? 'System';
}

export function NBText({
  variant = 'body',
  color = 'black',
  align = 'left',
  uppercase = false,
  style,
  children,
  ...rest
}: NBTextProps): React.JSX.Element {
  const typeToken = nbType[variantKey[variant]];
  const colorValue = nbColors[color] as string;

  const computedStyle: TextStyle = {
    fontFamily: rnFontFamily(typeToken.fontFamily),
    fontSize: typeToken.fontSize,
    fontWeight: typeToken.fontWeight as TextStyle['fontWeight'],
    lineHeight: typeToken.lineHeight,
    color: colorValue,
    textAlign: align,
    ...(uppercase && { textTransform: 'uppercase' }),
  };

  return (
    <Text
      style={[computedStyle, style]}
      accessibilityRole={HEADING_VARIANTS.has(variant) ? 'header' : 'text'}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Pre-built heading convenience components
export const NBHeading1 = (props: Omit<NBTextProps, 'variant'>) => (
  <NBText variant="h1" {...props} />
);
export const NBHeading2 = (props: Omit<NBTextProps, 'variant'>) => (
  <NBText variant="h2" {...props} />
);
export const NBHeading3 = (props: Omit<NBTextProps, 'variant'>) => (
  <NBText variant="h3" {...props} />
);
