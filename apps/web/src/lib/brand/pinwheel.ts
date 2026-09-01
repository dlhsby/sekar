/* eslint-disable sekar-design/no-inline-hex-colors --
 * Concrete hex is REQUIRED here: these values feed Satori (`next/og`) and sharp
 * raster pipelines, which cannot resolve `var(--color-nb-*)` CSS custom properties.
 * Values are kept in sync with the design tokens (see doc comment below). The
 * in-app DOM mark (`components/brand/SekarMark.tsx`) uses the CSS-var tokens. */
/**
 * SEKAR pinwheel brand mark — the canonical SVG source for generated icons
 * (favicon, apple-touch). 8 sage blades + yellow center hub on ink stroke,
 * ported from `specs/design-system/mockups/project/illustrations.html#sekar-mark`.
 *
 * Colors are concrete hex (not design-token CSS vars) on purpose: these are
 * consumed by Satori / `next/og` (ImageResponse) and standalone raster pipelines
 * that cannot resolve CSS custom properties. Keep in sync with the token values
 * `--color-nb-primary` (#7FBC8C), `--color-nb-black` (#1C1917),
 * `--color-bg-accent-yellow` (#FDFD96), `--color-nb-navy` (#1A4D2E).
 */
export const PINWHEEL = {
  blade: '#7FBC8C',
  ink: '#1C1917',
  center: '#FDFD96',
  greenBg: '#1A4D2E',
} as const;

const BLADE_PATH = 'M 0 -14 Q 18 -38 0 -42 Q -14 -38 0 -14 Z';
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Pinwheel mark as a standalone SVG string (transparent background, viewBox 120).
 * Pass `bg` to fill a colored square behind the mark (e.g. for app icons).
 */
export function pinwheelSvg({ bg }: { bg?: string } = {}): string {
  const background = bg ? `<rect width="120" height="120" fill="${bg}"/>` : '';
  const blades = ANGLES.map(
    (a) =>
      `<g transform="rotate(${a})"><path d="${BLADE_PATH}" fill="${PINWHEEL.blade}"/></g>`,
  ).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
    background +
    `<g transform="translate(60 60)" stroke="${PINWHEEL.ink}" stroke-width="3" stroke-linejoin="round">` +
    blades +
    `<circle r="12" fill="${PINWHEEL.center}"/>` +
    `</g></svg>`
  );
}

/** Pinwheel SVG as a base64 data URI, ready for an `<img src>` (Satori-friendly). */
export function pinwheelDataUri(opts: { bg?: string } = {}): string {
  const base64 = Buffer.from(pinwheelSvg(opts)).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
