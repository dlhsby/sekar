/**
 * Neo Brutalism Design System Tokens
 *
 * Design system for Phase 2+ featuring bold aesthetics with excellent usability.
 * Combines heavy borders, stark contrasts, and hard-edge shadows.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

/**
 * Color palette for Neo Brutalism design
 */
export const nbColors = {
  // Primary actions
  primary: '#0066CC', // Action blue - links, buttons
  primaryHover: '#0052A3', // Darker on hover
  primaryActive: '#003D7A', // Darkest on active

  // Status colors
  success: '#1B5E20', // Government green - success, online
  successLight: '#4CAF50', // Lighter variant
  warning: '#F57C00', // Alert orange (WCAG 4.5:1 compliant)
  warningLight: '#FFB74D', // Lighter variant
  danger: '#DC2626', // Error red - failures, offline
  dangerLight: '#EF5350', // Lighter variant

  // Neutral palette
  black: '#000000', // Borders, shadows, primary text
  white: '#FFFFFF', // Backgrounds, card surfaces
  navy: '#001F3F', // Trust/authority accent

  // Gray scale
  gray: {
    50: '#FAFAFA', // Hover backgrounds
    100: '#F5F5F5', // Disabled backgrounds
    200: '#EEEEEE', // Borders (light mode)
    300: '#E0E0E0', // Dividers
    400: '#BDBDBD', // Placeholder text
    500: '#9E9E9E', // Secondary text
    600: '#666666', // Body text
    700: '#424242', // Headings
    800: '#303030', // Dark mode surfaces
    900: '#212121', // Dark mode backgrounds
  },
};

/**
 * Shadow specifications (hard-edge offset shadows)
 * Neo Brutalism uses no blur for stark, bold appearance
 */
export const nbShadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4, // Android approximation
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  hover: {
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  active: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

/**
 * Border specifications
 * Bold black borders are a key characteristic of Neo Brutalism
 */
export const nbBorders = {
  thin: 2, // Secondary elements
  default: 3, // Primary elements
  thick: 4, // Emphasis
  color: '#000000',
  style: 'solid' as const,
};

/**
 * Border radius
 * Neo Brutalism uses sharp corners (0) except for avatars
 */
export const nbBorderRadius = {
  none: 0, // Default for all elements
  full: 9999, // Only for avatars, badges
};

/**
 * Spacing based on 8px baseline grid
 */
export const nbSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

/**
 * Typography specifications
 * Bold headings and clear body text for government field applications
 */
export const nbTypography = {
  fontFamily: {
    sans: 'System', // Platform default
    mono: 'Courier', // For codes/data
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Typography presets for common use cases
 */
export const nbTextStyles = {
  display: {
    fontSize: nbTypography.fontSize['4xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    lineHeight: nbTypography.fontSize['4xl'] * nbTypography.lineHeight.tight,
  },
  h1: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    lineHeight: nbTypography.fontSize['3xl'] * nbTypography.lineHeight.tight,
  },
  h2: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    lineHeight: nbTypography.fontSize['2xl'] * nbTypography.lineHeight.tight,
  },
  h3: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.semibold,
    lineHeight: nbTypography.fontSize.xl * nbTypography.lineHeight.tight,
  },
  bodyLarge: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.medium,
    lineHeight: nbTypography.fontSize.lg * nbTypography.lineHeight.normal,
  },
  body: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    lineHeight: nbTypography.fontSize.base * nbTypography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    lineHeight: nbTypography.fontSize.sm * nbTypography.lineHeight.normal,
  },
  caption: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    lineHeight: nbTypography.fontSize.xs * nbTypography.lineHeight.normal,
  },
};

/**
 * Touch targets (accessibility)
 * Minimum sizes for interactive elements
 */
export const nbTouchTarget = {
  minHeight: 48,
  minWidth: 48,
};

/**
 * Animation durations
 */
export const nbAnimation = {
  fast: 100, // Button press
  normal: 200, // State transitions
  slow: 300, // Page transitions
};

/**
 * Complete Neo Brutalism theme object
 */
export const nbTheme = {
  colors: nbColors,
  shadows: nbShadows,
  borders: nbBorders,
  borderRadius: nbBorderRadius,
  spacing: nbSpacing,
  typography: nbTypography,
  textStyles: nbTextStyles,
  touchTarget: nbTouchTarget,
  animation: nbAnimation,
};

export type NBTheme = typeof nbTheme;
export type NBShadowSize = keyof typeof nbShadows;
export type NBSpacingSize = keyof typeof nbSpacing;
