/**
 * Neo Brutalism Design System Tokens — Phase 3 M1-R consumer wrapper
 *
 * From 3-R2: all token VALUES live in generated/tokens.ts (emitted by scripts/build-tokens.ts).
 * This file re-exports the generated tokens and adds backward-compat shims for Phase 2 call
 * sites. The shims are tagged for removal in sub-phase 3-R5 (full redesign sweep).
 *
 * To change a token: edit specs/ui-ux/tokens.json → npm run tokens:build.
 * Never write hex literals here — ESLint rule no-inline-hex-colors enforces this.
 *
 * @see specs/ui-ux/design-tokens.md
 * @see specs/ui-ux/tokens.json (source of truth)
 */

export {
  nbFonts,
  nbMotion,
  nbRadius,
  nbShadow,
  nbShadows,
  nbTokens,
  nbType,
} from './generated/tokens';

import { nbColors as _gen, nbBorders as _genBorders, nbSpacing as _genSpacing } from './generated/tokens';
import { nbMotion, nbRadius, nbShadows, nbType } from './generated/tokens';

// ─── nbSpacing (augmented) ────────────────────────────────────────────────────
// Generated nbSpacing has named keys (xs/sm/md/lg/xl/2xl/3xl/touch). Phase 3 admin
// screens written in Apr 27 waves use Tailwind-style numeric subscripts (`nbSpacing[2]`,
// `nbSpacing[4]`) on a 4-px rhythm. Add numeric aliases as a backward-compat shim so
// those screens layout correctly without bulk-editing 30+ files. Remove in Phase 4 polish.
export const nbSpacing = {
  ..._genSpacing,
  1: 4,   // xs
  2: 8,   // sm
  3: 12,  // (no exact token; closest pair to "3" on 4-px scale)
  4: 16,  // md
  5: 20,
  6: 24,  // lg
  7: 28,
  8: 32,  // xl
  10: 40,
  12: 48, // 2xl
  16: 64, // 3xl
} as const;

// ─── nbColors ────────────────────────────────────────────────────────────────
// Flat generated palette (gray50…gray900, bgCanvas/bgOverlay/bgSurface, info,
// primary, warningLight, secondary, …). Phase-2 compat shims (nested gray,
// background/overlay/surface, accent* aliases) removed in 3-R5 — all call sites
// now use the flat generated names directly.
export const nbColors = {
  ..._gen,
} as const;

// ─── nbBorders ───────────────────────────────────────────────────────────────
// Generated widthThin/widthBase/widthThick/widthExtra. Phase-2 thin/base/thick/
// extra aliases removed in 3-R5.
export const nbBorders = {
  ..._genBorders,
} as const;

// ─── nbAnimation ───────────────────────────────────────────────────────────────
// Phase-2 `normal` duration alias removed in 3-R5; use nbMotion.enter/exit.
export const nbAnimation = {
  ...nbMotion,
} as const;

// ─── nbTypography ─────────────────────────────────────────────────────────────
// Phase 2 code reads nbTypography.fontSize.xl, fontWeight.bold, etc.
// Updated to match Phase 3 canonical type scale (drift fixes from 3-R2).
// Migrate call sites to nbType in 3-R5.
export const nbTypography = {
  fontFamily: {
    sans: 'Inter',
    display: "'Space Grotesk'",
    mono: "'JetBrains Mono'",
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
    md: 16, // Phase 2 alias for base — remove in 3-R5
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ─── nbTextStyles ─────────────────────────────────────────────────────────────
// Typography presets (size + weight + lineHeight only; no fontFamily).
// Phase 3 M1-R 3-R3 introduces NBText which supersedes these.
// Migrate call sites to NBText in 3-R5.
export const nbTextStyles = {
  display: {
    fontSize: nbType.displayXl.fontSize,
    fontWeight: nbType.displayXl.fontWeight,
    lineHeight: nbType.displayXl.lineHeight,
  },
  h1: {
    fontSize: nbType.h1.fontSize,
    fontWeight: nbType.h1.fontWeight,
    lineHeight: nbType.h1.lineHeight,
  },
  h2: {
    fontSize: nbType.h2.fontSize,
    fontWeight: nbType.h2.fontWeight,
    lineHeight: nbType.h2.lineHeight,
  },
  h3: {
    fontSize: nbType.h3.fontSize,
    fontWeight: nbType.h3.fontWeight,
    lineHeight: nbType.h3.lineHeight,
  },
  bodyLarge: {
    fontSize: nbType.bodyLg.fontSize,
    fontWeight: nbType.bodyLg.fontWeight,
    lineHeight: nbType.bodyLg.lineHeight,
  },
  body: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.body.fontWeight,
    lineHeight: nbType.body.lineHeight,
  },
  bodySmall: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.bodySm.fontWeight,
    lineHeight: nbType.bodySm.lineHeight,
  },
  caption: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.caption.fontWeight,
    lineHeight: nbType.caption.lineHeight,
  },
};

// ─── nbTouchTarget ────────────────────────────────────────────────────────────
export const nbTouchTarget = {
  minHeight: nbSpacing.touch,
  minWidth: nbSpacing.touch,
};

// ─── nbTheme ──────────────────────────────────────────────────────────────────
// Legacy aggregate. New Phase 3 code should import nbTokens from generated directly.
export const nbTheme = {
  colors: nbColors,
  shadows: nbShadows,
  borders: { color: nbColors.black, style: 'solid' as const, widthThin: 1, widthBase: 2, widthThick: 3, widthExtra: 4 },
  borderRadius: nbRadius,
  spacing: nbSpacing,
  typography: nbTypography,
  textStyles: nbTextStyles,
  touchTarget: nbTouchTarget,
  animation: nbMotion,
};

export type NBTheme = typeof nbTheme;
export type NBShadowSize = keyof typeof nbShadows;
export type NBSpacingSize = keyof typeof nbSpacing;

// ─── withAlpha ───────────────────────────────────────────────────────────────
// Helper for one-off transparency on token colors. Prefer opaque token colors
// where possible; rgba overlays belong in bg.overlay tokens.
export function withAlpha(color: string, alpha: number): string {
  if (alpha < 0 || alpha > 1) {
    alpha = Math.max(0, Math.min(1, alpha));
  }

  let hex = color.replace('#', '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
