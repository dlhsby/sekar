import React from 'react';
import { Platform, Text, type TextStyle, type TextProps } from 'react-native';
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

// On Android, React Native selects fonts by file name (PostScript name), not by
// the fontWeight property. We ship static per-weight TTF files so we must return
// the exact file name (without .ttf) for the requested weight.
// On iOS the system resolves weights from the font's internal metadata automatically.
const ANDROID_FONT_FILES: Record<string, Record<string, string>> = {
  'Space Grotesk': {
    '300': 'SpaceGrotesk-Regular',
    '400': 'SpaceGrotesk-Regular',
    '500': 'SpaceGrotesk-Medium',
    '600': 'SpaceGrotesk-Bold',   // no SemiBold in v2.0.0 — Bold is closest
    '700': 'SpaceGrotesk-Bold',
    '800': 'SpaceGrotesk-Bold',   // no ExtraBold in v2.0.0 — Bold is closest
    '900': 'SpaceGrotesk-Bold',
  },
  'Inter': {
    '300': 'Inter-Regular',
    '400': 'Inter-Regular',
    '500': 'Inter-Medium',
    '600': 'Inter-SemiBold',
    '700': 'Inter-Bold',
    '800': 'Inter-Bold',
    '900': 'Inter-Bold',
  },
  'JetBrains Mono': {
    '400': 'JetBrainsMono-Regular',
    '500': 'JetBrainsMono-Medium',
    '600': 'JetBrainsMono-SemiBold',
    '700': 'JetBrainsMono-SemiBold',
    '800': 'JetBrainsMono-SemiBold',
    '900': 'JetBrainsMono-SemiBold',
  },
};

// Strip CSS font-family stack to first family name: "'Inter', sans-serif" → "Inter"
// On Android, also resolves to the weight-specific PostScript name.
function rnFontFamily(cssFontStack: string, fontWeight?: string): string {
  const match = cssFontStack.match(/['"]?([^'",]+)['"]?/);
  const family = match?.[1]?.trim() ?? 'System';
  if (Platform.OS === 'android' && fontWeight) {
    return ANDROID_FONT_FILES[family]?.[fontWeight] ?? family;
  }
  return family;
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
    fontFamily: rnFontFamily(typeToken.fontFamily, typeToken.fontWeight),
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
