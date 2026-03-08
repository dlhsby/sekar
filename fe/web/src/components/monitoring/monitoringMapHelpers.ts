/**
 * MonitoringMap DOM/GeoJSON helpers — extracted to keep MonitoringMap under 600 lines
 */

import {
  STATUS_COLORS,
  STATUS_LABELS,
  ROLE_MARKER_ICONS,
  ROLE_ABBREVIATIONS,
  ROLE_FULL_LABELS,
  ZOOM_BREAKPOINTS,
  POLYGON_STYLES,
  CENTER_MARKER_STYLES,
} from '@/lib/constants/monitoring';
import type { LiveUser, TrackingStatus, BoundariesResponse } from '@/lib/api/monitoring';

// ─── SVG icon helpers ─────────────────────────────────────────────────────────

const ROLE_SVG_PATHS: Record<string, string> = {
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

export function createRoleIconSvg(role: string): SVGSVGElement {
  const iconName = ROLE_MARKER_ICONS[role] ?? 'user';
  const pathData = ROLE_SVG_PATHS[iconName] ?? ROLE_SVG_PATHS.user;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'white');
  svg.style.display = 'block';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

// ─── Marker animation ─────────────────────────────────────────────────────────

export function getMarkerAnimation(status: TrackingStatus): string {
  if (status === 'inactive') return 'animation: marker-pulse-slow 2s infinite;';
  if (status === 'missing') return 'animation: marker-pulse-fast 1s infinite;';
  return '';
}

// ─── Marker label text by zoom ────────────────────────────────────────────────

export function buildLabelText(user: LiveUser, zoom: number): string {
  if (zoom < ZOOM_BREAKPOINTS.noLabel) return '';
  if (zoom < ZOOM_BREAKPOINTS.abbreviated) {
    const abbr = ROLE_ABBREVIATIONS[user.role] ?? user.role.toUpperCase().slice(0, 3);
    return `${abbr} - ${user.full_name.split(' ')[0]}`;
  }
  const fullRole = ROLE_FULL_LABELS[user.role] ?? user.role;
  return `${fullRole} - ${user.full_name}`;
}

export function updateMarkerLabel(wrapper: HTMLElement, user: LiveUser, zoom: number): void {
  const label = wrapper.querySelector('.monitoring-marker-label') as HTMLElement | null;
  if (!label) return;
  const text = buildLabelText(user, zoom);
  if (text) {
    label.textContent = text;
    label.style.display = 'block';
  } else {
    label.style.display = 'none';
  }
}

// ─── User marker DOM element ──────────────────────────────────────────────────

export function createMarkerElement(user: LiveUser, zoom: number, opacity = 1): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'monitoring-marker-wrapper';
  wrapper.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer;
    user-select:none;width:44px;min-height:44px;justify-content:center;
    opacity:${opacity};transition:opacity 0.2s;`;

  const color = STATUS_COLORS[user.status] ?? '#6B7280';
  const statusLabel = STATUS_LABELS[user.status] ?? user.status;

  const el = document.createElement('div');
  el.className = 'monitoring-marker';
  el.style.cssText = `width:36px;height:36px;border-radius:50%;background-color:${color};
    border:3px ${user.status === 'outside_area' ? 'dashed' : 'solid'} #000;
    box-shadow:2px 2px 0 #000;display:flex;align-items:center;justify-content:center;
    transition:transform 0.15s;${getMarkerAnimation(user.status)}`;
  el.appendChild(createRoleIconSvg(user.role));

  const labelText = buildLabelText(user, zoom);
  const label = document.createElement('div');
  label.className = 'monitoring-marker-label';
  label.style.cssText = `font-size:10px;font-weight:700;color:#1C1917;
    background:rgba(255,255,255,0.9);padding:1px 4px;border-radius:3px;border:1px solid #000;
    margin-top:2px;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;
    text-align:center;line-height:1.2;display:${labelText ? 'block' : 'none'};`;
  label.textContent = labelText || user.full_name.split(' ')[0];

  wrapper.appendChild(el);
  wrapper.appendChild(label);
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', `${user.full_name} - ${statusLabel}`);
  wrapper.setAttribute('tabindex', '0');
  return wrapper;
}

// ─── Polygon centroid ─────────────────────────────────────────────────────────

export function polygonCentroid(
  geometry: GeoJSON.Geometry | null,
  fallbackLat: number | null,
  fallbackLng: number | null
): [number, number] | null {
  if (fallbackLat != null && fallbackLng != null) return [fallbackLng, fallbackLat];
  if (!geometry || geometry.type !== 'Polygon') return null;
  const coords = (geometry as GeoJSON.Polygon).coordinates[0];
  if (!coords?.length) return null;
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}

// ─── Center marker DOM element ────────────────────────────────────────────────

export function createCenterMarkerEl(
  label: string,
  size: number,
  bg: string,
  tooltip: string
): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${bg};
    border:2px solid #000;box-shadow:2px 2px 0 #000;display:flex;align-items:center;
    justify-content:center;font-size:${size < 30 ? '10' : '11'}px;font-weight:800;color:#fff;
    cursor:pointer;user-select:none;`;
  el.textContent = label;
  el.setAttribute('title', tooltip);
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', tooltip);
  el.setAttribute('tabindex', '0');
  return el;
}

// ─── Trail point DOM element ──────────────────────────────────────────────────

export function createTrailPointEl(
  isFirst: boolean,
  isLast: boolean,
  isWithin: boolean,
  isSelected: boolean
): HTMLElement {
  let bg = isWithin ? '#15803D' : '#9333EA';
  if (isFirst) bg = '#15803D';
  if (isLast) bg = '#DC2626';

  const size = isSelected ? 14 : 8;
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${bg};
    border:${isSelected ? '2px solid #000' : '1px solid rgba(0,0,0,0.4)'};
    box-shadow:${isSelected ? '0 0 0 3px rgba(255,255,255,0.8)' : 'none'};
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    transition:all 0.15s;`;

  if (isFirst || isLast) {
    const lbl = document.createElement('div');
    lbl.style.cssText = `position:absolute;top:-18px;left:50%;transform:translateX(-50%);
      font-size:9px;font-weight:700;background:${bg};color:#fff;
      padding:1px 3px;border-radius:2px;white-space:nowrap;`;
    lbl.textContent = isFirst ? 'Mulai' : 'Akhir';
    el.style.position = 'relative';
    el.appendChild(lbl);
  }
  return el;
}

// ─── GeoJSON feature builders ─────────────────────────────────────────────────

export function buildRayonFeatures(
  boundaries: BoundariesResponse
): GeoJSON.Feature<GeoJSON.Geometry>[] {
  return boundaries.rayons
    .filter((r) => r.boundary_polygon)
    .map((r) => ({
      type: 'Feature' as const,
      geometry: r.boundary_polygon as GeoJSON.Geometry,
      properties: { id: r.id, name: r.name, is_understaffed: r.is_understaffed },
    }));
}

export function buildAreaFeatures(
  boundaries: BoundariesResponse
): GeoJSON.Feature<GeoJSON.Geometry>[] {
  return boundaries.rayons.flatMap((r) =>
    r.areas
      .filter((a) => a.boundary_polygon)
      .map((a) => ({
        type: 'Feature' as const,
        geometry: a.boundary_polygon as GeoJSON.Geometry,
        properties: {
          id: a.id,
          name: a.name,
          rayon_name: r.name,
          is_understaffed: a.is_understaffed,
          assigned_count: a.assigned_count,
        },
      }))
  );
}

// ─── Rayon bounds computation ─────────────────────────────────────────────────

export function computeRayonBounds(
  boundaries: BoundariesResponse,
  rayonId: string
): { bounds: [[number, number], [number, number]]; center: [number, number] | null } | null {
  const rayon = boundaries.rayons.find((r) => r.id === rayonId);
  if (!rayon) return null;

  const allCoords: [number, number][] = [];
  rayon.areas.forEach((area) => {
    if (area.boundary_polygon?.type === 'Polygon') {
      (area.boundary_polygon as GeoJSON.Polygon).coordinates[0]?.forEach(([lng, lat]) => {
        allCoords.push([lng, lat]);
      });
    }
  });

  const center =
    rayon.center_lat != null && rayon.center_lng != null
      ? ([rayon.center_lng, rayon.center_lat] as [number, number])
      : null;

  if (allCoords.length === 0)
    return {
      bounds: [
        [0, 0],
        [0, 0],
      ],
      center,
    };

  const lngs = allCoords.map(([lng]) => lng);
  const lats = allCoords.map(([, lat]) => lat);
  const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
  const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
  return { bounds: [sw, ne], center };
}

// Re-export constants used in main component for convenience
export { POLYGON_STYLES, CENTER_MARKER_STYLES };
