import * as React from 'react';

const BLADE_PATH = 'M 0 -14 Q 18 -38 0 -42 Q -14 -38 0 -14 Z';
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export interface SekarMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered width & height in px (square). Defaults to 32. */
  size?: number;
}

/**
 * SEKAR pinwheel brand mark — the canonical in-app logo (8 sage blades = 8 rayons,
 * yellow center = DLH Surabaya). Colors come from design tokens via CSS vars so the
 * mark tracks theme changes and satisfies the `no-inline-hex-colors` lint rule.
 * For raster icons (favicon/app icon) use `@/lib/brand/pinwheel` instead.
 */
export function SekarMark({ size = 32, ...props }: SekarMarkProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="SEKAR"
      {...props}
    >
      <g
        transform="translate(60 60)"
        stroke="var(--color-nb-black)"
        strokeWidth={3}
        strokeLinejoin="round"
      >
        {ANGLES.map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d={BLADE_PATH} fill="var(--color-nb-primary)" />
          </g>
        ))}
        <circle r={12} fill="var(--color-bg-accent-yellow)" />
      </g>
    </svg>
  );
}

export default SekarMark;
