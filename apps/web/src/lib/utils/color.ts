/**
 * Colour helpers for data-driven role accents (ADR-044). Role colours arrive as
 * runtime hex strings (`marker_color`), so we compute a readable ink at render
 * time rather than relying on fixed Tailwind classes.
 */

const HEX6 = /^#([0-9a-fA-F]{6})$/;

/**
 * Pick a readable ink (black or white) for text on top of `hexBg`, returning a
 * design-token CSS variable so it still honours the palette. Uses the YIQ
 * brightness heuristic; falls back to black ink for an invalid/undefined colour.
 */
export function readableInk(hexBg?: string | null): string {
  const match = hexBg?.match(HEX6);
  if (!match) return 'var(--color-nb-black)';
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  // YIQ brightness: >= 140 reads as a light background → use dark ink.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? 'var(--color-nb-black)' : 'var(--color-nb-white)';
}

/** True when `value` is a valid 6-digit hex colour. */
export function isHexColor(value?: string | null): value is string {
  return !!value && HEX6.test(value);
}
