'use client';

import type { ColumnDef } from '@tanstack/react-table';

/**
 * Shared colour rendering for the map-style grids (district / kawasan / lokasi) and
 * anywhere a per-level colour is shown. Renders a swatch that reflects the border
 * + fill colours AT their opacities, plus a compact hex · opacity readout so the
 * grid "Warna" column is identical everywhere. See `mapStyleColorColumn` for the
 * standardized (unfilterable) column.
 */

export interface MapStyleColors {
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
}

/** Parse a #rgb / #rrggbb hex to an `rgba(...)` string at the given alpha (0–1). */
function hexToRgba(hex: string, alpha: number): string | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * EFFECTIVE opacity when the field is null, matching exactly what each renderer
 * draws — so the grid never claims a percentage the map does not use.
 *
 * A boundary FILL is the odd one out: `GoogleBoundaryEditor` / `MapDisplayModal`
 * draw an unset fill at 0.25 (a light tint), not opaque. This swatch used to show
 * it as "100%", which made an unset fill look solid in the grid and translucent on
 * the map. Strokes, pins and single-colour entities are all opaque when unset.
 */
export const UNSET_OPACITY = { border: 1, fill: 0.25, single: 1 } as const;

const pct = (o: number | null | undefined, fallback: number): number =>
  Math.round((o ?? fallback) * 100);

/** Compact "#hex · 80%" line, or a dash when the colour is unset. */
function ColorLine({
  label,
  hex,
  opacity,
  fallback,
}: {
  label?: string;
  hex?: string | null;
  opacity?: number | null;
  fallback: number;
}) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap font-mono text-nb-caption text-nb-gray-600">
      {label ? <span className="text-nb-gray-400">{label}</span> : null}
      {hex ? (
        <>
          <span>{hex}</span>
          <span className="text-nb-gray-400">· {pct(opacity, fallback)}%</span>
        </>
      ) : (
        <span className="text-nb-gray-400">—</span>
      )}
    </span>
  );
}

export interface MapStyleSwatchProps extends MapStyleColors {
  /**
   * Render ONE colour with no border ring — for entities that have a single
   * colour rather than the geography tiers' border/fill pair (a team category
   * has no boundary to outline). Reads `fill_color` / `fill_opacity` and drops
   * the `B`/`F` prefixes, since there is nothing to tell apart.
   */
  single?: boolean;
}

export function MapStyleSwatch({
  border_color,
  fill_color,
  border_opacity,
  fill_opacity,
  single,
}: MapStyleSwatchProps) {
  if (single) {
    if (!fill_color) return <span className="text-nb-gray-500">—</span>;
    return (
      <span className="inline-flex items-center gap-2">
        <span
          className="h-5 w-5 shrink-0 rounded-nb-sm"
          style={{
            backgroundColor:
              hexToRgba(fill_color, fill_opacity ?? UNSET_OPACITY.single) ?? fill_color,
          }}
          aria-hidden
        />
        <ColorLine hex={fill_color} opacity={fill_opacity} fallback={UNSET_OPACITY.single} />
      </span>
    );
  }

  const borderCss =
    (border_color && hexToRgba(border_color, border_opacity ?? UNSET_OPACITY.border)) ??
    'var(--color-nb-black)';
  const fillCss =
    (fill_color && hexToRgba(fill_color, fill_opacity ?? UNSET_OPACITY.fill)) ?? 'transparent';
  const hasAny = !!(border_color || fill_color);

  if (!hasAny) return <span className="text-nb-gray-500">—</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-5 w-5 shrink-0 rounded-nb-sm border-2"
        style={{ backgroundColor: fillCss, borderColor: borderCss }}
        aria-hidden
      />
      <span className="flex flex-col leading-tight">
        <ColorLine
          label="B"
          hex={border_color}
          opacity={border_opacity}
          fallback={UNSET_OPACITY.border}
        />
        <ColorLine label="F" hex={fill_color} opacity={fill_opacity} fallback={UNSET_OPACITY.fill} />
      </span>
    </span>
  );
}

/**
 * Standardized "Warna" column for a map-style grid: swatch + hex · opacity, no
 * sort, NO filter (a hex-text filter is useless). Same behaviour across district,
 * kawasan and lokasi grids. `get` extracts the four colour fields from a row
 * (defaults to identity for entities that already carry them).
 */
export function mapStyleColorColumn<T extends MapStyleColors>(colorLabel: string): ColumnDef<T>;
export function mapStyleColorColumn<T>(
  colorLabel: string,
  get: (row: T) => MapStyleColors,
  options?: { single?: boolean },
): ColumnDef<T>;
export function mapStyleColorColumn<T>(
  colorLabel: string,
  // Entities that already carry the four colour fields (the geography tiers) pass
  // nothing; anything else maps its own fields in.
  get: (row: T) => MapStyleColors = (row) => row as unknown as MapStyleColors,
  options: { single?: boolean } = {},
): ColumnDef<T> {
  return {
    id: 'color',
    header: colorLabel,
    enableSorting: false,
    enableColumnFilter: false,
    meta: { label: colorLabel },
    cell: ({ row }) => <MapStyleSwatch {...get(row.original)} single={options.single} />,
  };
}
