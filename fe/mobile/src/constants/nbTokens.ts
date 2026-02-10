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
 * Nature-themed for DLH Surabaya (Parks & Environment Management)
 */
export const nbColors = {
  // PRIMARY: Neo Brutalism Green (from palette column 2, row 4)
  primary: '#7FBC8C', // Medium green - headers, primary buttons
  primaryLight: '#90EE90', // Light green (row 3) - hover states
  primaryDark: '#5A9B6F', // Darker green - active/pressed states

  // SECONDARY: Earth Brown (grounding, natural)
  secondary: '#6B4423', // Rich earth brown - secondary actions
  secondaryLight: '#8B5E3C', // Lighter earth tone
  secondaryDark: '#4A2F18', // Darker earth tone

  // ACCENT: Neo Brutalism Palette (vibrant and bold)
  accentGrass: '#BAFCA2', // Bright light green (row 2, col 2) - badges, highlights
  accentSky: '#87CEEB', // Sky blue (row 3, col 1) - info elements
  accentSunshine: '#FFDB58', // Bright yellow (row 2, col 3) - notifications
  accentFlower: '#FF69B4', // Hot pink (row 4, col 5) - special events

  // BACKGROUNDS: Neo Brutalism Pastels (row 1 from palette)
  background: '#F5F0EB', // Warm stone grey - main background (reduces eye fatigue for outdoor use, maintains Neo Brutalism warmth)
  backgroundSecondary: '#B5D2AD', // Pastel green (row 1, col 2) - secondary surfaces
  backgroundMint: '#DAF5F0', // Very light mint (row 1, col 1) - alternative light background (legacy)
  surface: '#FFFFFF', // Pure white for cards (maximum contrast)
  surfaceElevated: '#FCDFFF', // Light lavender (row 1, col 5) - elevated surfaces

  // STATUS COLORS (Neo Brutalism palette)
  success: '#90EE90', // Light green (row 3, col 2) - success states
  successLight: '#B5D2AD', // Pastel green (row 1, col 2) - light background
  successDark: '#15803D', // Dark green - status indicator icons, high contrast text
  warning: '#E3A018', // Dark golden (row 4, col 3) - maintenance alerts, timer
  warningLight: '#FDFD96', // Pastel yellow (row 1, col 3) - light background
  danger: '#FF6B6B', // Coral red (row 4, col 4) - urgent/error states
  dangerLight: '#FFA07A', // Light salmon (row 2, col 4) - light background
  dangerDark: '#991B1B', // Dark red - status indicator icons, high contrast text
  info: '#69D2E7', // Cyan blue (row 4, col 1) - info states
  infoLight: '#A7DBD8', // Light cyan (row 2, col 1) - light background
  grayMedium: '#A8A29E', // Medium warm grey - loading states, disabled text

  // NEUTRAL PALETTE
  black: '#1C1917', // Warm stone black - borders, shadows, primary text (NB 2.0)
  white: '#FFFFFF', // Pure white for maximum contrast
  navy: '#1A4D2E', // Dark forest green - sidebar, trust/authority (NB 2.0)

  // OVERLAY/MODAL COLORS
  overlay: 'rgba(0, 0, 0, 0.5)', // Standard modal overlay
  overlayLight: 'rgba(0, 0, 0, 0.3)', // Light overlay
  overlayDark: 'rgba(0, 0, 0, 0.7)', // Dark overlay

  // GRAY SCALE (kept for UI flexibility)
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
 * Shadow specifications (soft-edge shadows)
 * NB 2.0 uses subtle blur for softer, more refined appearance
 */
export const nbShadows = {
  xs: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  hover: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  active: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1, // Minimal blur for consistency with soft-edge system
    elevation: 1,
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
 * NB 2.0 uses refined border widths with warm stone black
 */
export const nbBorders = {
  thin: 1, // Subtle borders
  base: 2, // Primary elements (renamed from 'default')
  thick: 3, // Emphasis
  extra: 4, // Heavy emphasis
  color: '#1C1917', // Warm stone black (NB 2.0)
  style: 'solid' as const,
};

/**
 * Border radius
 * NB 2.0 uses slightly softer corners for improved mobile UX
 */
export const nbBorderRadius = {
  none: 0, // Pure NB (strict mode) - dividers, borders
  sm: 4, // Small elements - badges, pills, small chips
  base: 6, // Primary elements - buttons, cards, inputs (renamed from 'minimal')
  md: 8, // Medium elements - modals, larger cards
  lg: 12, // Large elements - hero sections
  full: 9999, // Avatars and status indicators
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

/**
 * Helper function to add alpha transparency to hex colors
 *
 * @param color - Hex color string (e.g., '#7FBC8C', '7FBC8C', '#FFF')
 *                Supports both 6-digit and 3-digit hex formats
 * @param alpha - Alpha value between 0 and 1 (will be clamped)
 * @returns RGBA color string (e.g., 'rgba(127, 188, 140, 0.5)')
 *
 * @example
 * withAlpha('#7FBC8C', 0.5) // 'rgba(127, 188, 140, 0.5)'
 * withAlpha('#FFF', 0.3)    // 'rgba(255, 255, 255, 0.3)'
 */
export function withAlpha(color: string, alpha: number): string {
  // Validate and clamp alpha to 0-1 range
  if (alpha < 0 || alpha > 1) {
    console.warn(`withAlpha: alpha must be between 0 and 1, got ${alpha}`);
    alpha = Math.max(0, Math.min(1, alpha));
  }

  // Remove # if present
  let hex = color.replace('#', '');

  // Expand 3-digit hex to 6-digit (e.g., 'FFF' -> 'FFFFFF')
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    console.error(`withAlpha: Invalid hex color "${color}"`);
    return `rgba(0, 0, 0, ${alpha})`; // Fallback to black
  }

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
