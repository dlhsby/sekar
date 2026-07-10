/**
 * GENERATED FILE — DO NOT EDIT.
 * Source of truth: specs/design-system/tokens.json
 * Run `npm run tokens:build` from the repo root to regenerate.
 * CI rejects drift via the `tokens-verify` job (ADR-036).
 */

import type { ViewStyle } from 'react-native';

export const nbColors = {
  bgAccentGreen: "#B5D2AD",
  bgAccentLilac: "#E8DFF5",
  bgAccentMint: "#DAF5F0",
  bgAccentPink: "#FCDFFF",
  bgAccentYellow: "#FDFD96",
  bgCanvas: "#F5F0EB",
  bgOverlay: "rgba(0,0,0,0.5)",
  bgSurface: "#FFFFFF",
  black: "#1C1917",
  danger: "#FF6B6B",
  dangerDark: "#991B1B",
  dangerLight: "#FFA07A",
  gray100: "#F5F5F4",
  gray200: "#E7E5E4",
  gray300: "#D6D3D1",
  gray400: "#A8A29E",
  gray50: "#FAFAF9",
  gray500: "#78716C",
  gray600: "#57534E",
  gray700: "#44403C",
  gray800: "#292524",
  gray900: "#1C1917",
  info: "#69D2E7",
  infoLight: "#A7DBD8",
  navy: "#1A4D2E",
  plantDue: "#D97706",
  plantOk: "#15803D",
  plantOverdue: "#DC2626",
  primary: "#7FBC8C",
  primaryActive: "#5A9468",
  primaryHover: "#6BA87A",
  requestApproved: "#15803D",
  requestCancelled: "#9CA3AF",
  requestConverted: "#7C3AED",
  requestDone: "#16A34A",
  requestInProgress: "#D97706",
  requestRejected: "#DC2626",
  requestSubmitted: "#6B7280",
  requestUnderReview: "#2563EB",
  roleAdminData: "#9333EA",
  roleAdminSys: "#57534E",
  roleKecamatan: "#FDFD96",
  roleKepala: "#F48572",
  roleKorlap: "#E3A018",
  roleLinmas: "#2563EB",
  roleSatgas: "#7FBC8C",
  roleSuperadmin: "#1C1917",
  roleTop: "#1A4D2E",
  secondary: "#8B7355",
  secondaryHover: "#725E45",
  sidebarActive: "#0F3520",
  sidebarBg: "#1A4D2E",
  sidebarBorder: "#2D5233",
  sidebarFg: "#FFFFFF",
  sidebarHover: "#2D5233",
  statusActive: "#15803D",
  statusActiveBg: "#DCFCE7",
  statusIdle: "#92400E",
  statusIdleBg: "#FEF3C7",
  statusMissing: "#B91C1C",
  statusMissingBg: "#FEE2E2",
  statusOffline: "#4B5563",
  statusOfflineBg: "#F3F4F6",
  statusOutside: "#9333EA",
  statusOutsideBg: "#F3E8FF",
  success: "#7FBC8C",
  successDark: "#15803D",
  successLight: "#BAFCA2",
  warning: "#E3A018",
  warningLight: "#FFDB58",
  white: "#FFFFFF",
} as const;

export const nbShadows: Record<string, ViewStyle> = {
  active: {
    elevation: 2,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 2,
      width: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  hover: {
    elevation: 6,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 6,
      width: 6,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  lg: {
    elevation: 6,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 6,
      width: 6,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  md: {
    elevation: 4,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 4,
      width: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  none: {
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  sm: {
    elevation: 3,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 3,
      width: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  xl: {
    elevation: 10,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 10,
      width: 10,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  xs: {
    elevation: 2,
    shadowColor: "#1C1917",
    shadowOffset: {
      height: 2,
      width: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
};

export const nbSpacing = {
  "2xl": 48,
  "3xl": 64,
  lg: 24,
  md: 16,
  sm: 8,
  touch: 48,
  xl: 32,
  xs: 4,
} as const;

export const nbBorders = {
  color: "#1C1917",
  style: "solid",
  widthBase: 2,
  widthExtra: 4,
  widthThick: 2.5,
  widthThin: 1,
} as const;

export const nbRadius = {
  base: 10,
  full: 9999,
  lg: 20,
  md: 14,
  none: 0,
  sm: 4,
} as const;

export const nbFonts = {
  body: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  display: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

export const nbType = {
  body: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  bodyLg: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 28,
  },
  bodySm: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  caption: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  display: {
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 42,
  },
  displayXl: {
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontSize: 56,
    fontWeight: "800",
    lineHeight: 56,
  },
  h1: {
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  h2: {
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 29,
  },
  h3: {
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  monoSm: {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
} as const;

export const nbMotion = {
  enter: {
    duration: 200,
    easing: "ease-out",
  },
  exit: {
    duration: 250,
    easing: "ease-in",
  },
  hover: {
    duration: 150,
    easing: "ease-out",
  },
  press: {
    duration: 100,
    easing: "ease-out",
  },
} as const;

export function nbShadow(level: keyof typeof nbShadows): ViewStyle {
  return nbShadows[level];
}

export const nbTokens = {
  colors: nbColors,
  shadows: nbShadows,
  spacing: nbSpacing,
  borders: nbBorders,
  radius: nbRadius,
  fonts: nbFonts,
  type: nbType,
  motion: nbMotion,
} as const;
