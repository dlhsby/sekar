'use client';

/**
 * MonitoringMap - Mapbox GL map for real-time user monitoring
 * Shows user markers with status colors and area polygons
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { surabayaCenter } from '@/lib/maps/styles';
import { cn } from '@/lib/utils/cn';
import { STATUS_COLORS, STATUS_LABELS, ROLE_MARKER_ICONS } from '@/lib/constants/monitoring';
import type { LiveUser, TrackingStatus, LocationHistoryPoint } from '@/lib/api/monitoring';
import type { Area } from '@/types/models';

// Set Mapbox token once
if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token && token !== 'your-mapbox-token-here') {
    mapboxgl.accessToken = token;
  }
}

export interface MonitoringMapProps {
  users: LiveUser[];
  areas?: Area[];
  selectedUserId: string | null;
  onUserSelect: (user: LiveUser) => void;
  trailPoints?: LocationHistoryPoint[];
  className?: string;
}

// SVG icon paths for role markers (all hardcoded, safe)
const ROLE_SVG_PATHS: Record<string, string> = {
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

function createRoleIconSvg(role: string): SVGSVGElement {
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

function getMarkerAnimation(status: TrackingStatus): string {
  switch (status) {
    case 'inactive': return 'animation: marker-pulse-slow 2s infinite;';
    case 'missing': return 'animation: marker-pulse-fast 1s infinite;';
    default: return '';
  }
}

function createMarkerElement(user: LiveUser): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'monitoring-marker-wrapper';
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    user-select: none;
    width: 44px;
    min-height: 44px;
    justify-content: center;
  `;

  const color = STATUS_COLORS[user.status] ?? '#6B7280';
  const statusLabel = STATUS_LABELS[user.status] ?? user.status;

  // Main marker circle (36px)
  const el = document.createElement('div');
  el.className = 'monitoring-marker';
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: ${color};
    border: 3px ${user.status === 'outside_area' ? 'dashed' : 'solid'} #000;
    box-shadow: 2px 2px 0 #000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    ${getMarkerAnimation(user.status)}
  `;
  el.appendChild(createRoleIconSvg(user.role));

  // Name label below marker
  const label = document.createElement('div');
  label.style.cssText = `
    font-size: 10px;
    font-weight: 700;
    color: #1C1917;
    background: rgba(255,255,255,0.9);
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #000;
    margin-top: 2px;
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    line-height: 1.2;
  `;
  label.textContent = user.full_name.split(' ')[0];

  wrapper.appendChild(el);
  wrapper.appendChild(label);

  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', `${user.full_name} - ${statusLabel}`);
  wrapper.setAttribute('tabindex', '0');

  return wrapper;
}

export function MonitoringMap({
  users,
  areas = [],
  selectedUserId,
  onUserSelect,
  trailPoints,
  className = '',
}: MonitoringMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; popup: mapboxgl.Popup }>>(
    new Map()
  );
  const isLoadedRef = useRef(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  const hasToken =
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN &&
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN !== 'your-mapbox-token-here';

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !hasToken || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: surabayaCenter,
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      isLoadedRef.current = true;
      mapRef.current = map;
    });

    mapRef.current = map;

    return () => {
      isLoadedRef.current = false;
      markersRef.current.forEach(({ marker, popup }) => {
        popup.remove();
        marker.remove();
      });
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  // Update user markers when users change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const currentIds = new Set(users.map((u) => u.id));

    // Remove stale markers
    markersRef.current.forEach(({ marker, popup }, id) => {
      if (!currentIds.has(id)) {
        popup.remove();
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    users.forEach((user) => {
      if (
        !user.latitude ||
        !user.longitude ||
        (user.latitude === 0 && user.longitude === 0)
      ) {
        return;
      }

      const existing = markersRef.current.get(user.id);

      if (existing) {
        // Update position and color
        existing.marker.setLngLat([user.longitude, user.latitude]);
        const wrapperEl = existing.marker.getElement();
        const markerDot = wrapperEl.querySelector('.monitoring-marker') as HTMLElement;
        if (markerDot) {
          const color = STATUS_COLORS[user.status] ?? '#6B7280';
          markerDot.style.backgroundColor = color;
          markerDot.style.borderStyle = user.status === 'outside_area' ? 'dashed' : 'solid';
          markerDot.style.animation = getMarkerAnimation(user.status).replace('animation: ', '').replace(';', '');
        }
        return;
      }

      // Create new marker
      const el = createMarkerElement(user);
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 16,
        className: 'monitoring-popup',
      }).setHTML(
        `<div style="font-weight:700;font-size:12px;white-space:nowrap;">${user.full_name}</div>
         <div style="font-size:11px;color:#666;">${user.area_name || '—'}</div>`
      );

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([user.longitude, user.latitude])
        .addTo(map);

      el.addEventListener('mouseenter', () => {
        popup.setLngLat([user.longitude, user.latitude]).addTo(map);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', () => onUserSelect(user));
      el.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') onUserSelect(user);
      });

      markersRef.current.set(user.id, { marker, popup });
    });
  }, [users, onUserSelect]);

  // Fly to selected user
  useEffect(() => {
    if (!mapRef.current || !selectedUserId) return;
    const user = users.find((u) => u.id === selectedUserId);
    if (!user || !user.latitude || !user.longitude) return;

    mapRef.current.flyTo({
      center: [user.longitude, user.latitude],
      zoom: 16,
      duration: 800,
    });
  }, [selectedUserId, users]);

  // Draw area polygons (run once when areas change after load)
  const drawAreas = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    // Remove previous area layers/sources
    if (map.getLayer('areas-fill')) map.removeLayer('areas-fill');
    if (map.getLayer('areas-outline')) map.removeLayer('areas-outline');
    if (map.getSource('areas')) map.removeSource('areas');

    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = areas
      .filter((a) => a.boundary_polygon)
      .map((a) => ({
        type: 'Feature' as const,
        geometry: a.boundary_polygon as GeoJSON.Polygon,
        properties: { id: a.id, name: a.name },
      }));

    if (features.length === 0) return;

    map.addSource('areas', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.addLayer({
      id: 'areas-fill',
      type: 'fill',
      source: 'areas',
      paint: { 'fill-color': '#fbbf24', 'fill-opacity': 0.15 },
    });

    map.addLayer({
      id: 'areas-outline',
      type: 'line',
      source: 'areas',
      paint: { 'line-color': '#000', 'line-width': 2 },
    });
  }, [areas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isLoadedRef.current) {
      drawAreas();
    } else {
      map.once('load', drawAreas);
    }
  }, [drawAreas]);

  // Style toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const styleUrl = mapStyle === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/streets-v12';

    map.setStyle(styleUrl);

    // Redraw areas after style change
    map.once('style.load', () => {
      drawAreas();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Draw trail polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    // Clean up previous trail layers
    if (map.getLayer('trail-inside')) map.removeLayer('trail-inside');
    if (map.getLayer('trail-outside')) map.removeLayer('trail-outside');
    if (map.getSource('trail-inside')) map.removeSource('trail-inside');
    if (map.getSource('trail-outside')) map.removeSource('trail-outside');

    if (!trailPoints || trailPoints.length < 2) return;

    // Split points into inside/outside segments
    const insideCoords: [number, number][] = [];
    const outsideCoords: [number, number][] = [];

    for (let i = 0; i < trailPoints.length - 1; i++) {
      const p1 = trailPoints[i];
      const p2 = trailPoints[i + 1];
      const coord1: [number, number] = [p1.longitude, p1.latitude];
      const coord2: [number, number] = [p2.longitude, p2.latitude];

      if (p1.is_within_area && p2.is_within_area) {
        insideCoords.push(coord1, coord2);
      } else {
        outsideCoords.push(coord1, coord2);
      }
    }

    if (insideCoords.length > 0) {
      map.addSource('trail-inside', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: insideCoords },
          properties: {},
        },
      });
      map.addLayer({
        id: 'trail-inside',
        type: 'line',
        source: 'trail-inside',
        paint: { 'line-color': '#15803D', 'line-width': 3, 'line-opacity': 0.8 },
      });
    }

    if (outsideCoords.length > 0) {
      map.addSource('trail-outside', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: outsideCoords },
          properties: {},
        },
      });
      map.addLayer({
        id: 'trail-outside',
        type: 'line',
        source: 'trail-outside',
        paint: {
          'line-color': '#9333EA',
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      });
    }
  }, [trailPoints]);

  if (!hasToken) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-nb-gray-100 border-4 border-nb-black',
          className
        )}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="font-bold text-lg mb-2">Token Mapbox Belum Dikonfigurasi</h3>
          <p className="text-sm text-nb-gray-600 max-w-xs">
            Tambahkan <code className="font-mono bg-nb-gray-200 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code>{' '}
            di file <code className="font-mono bg-nb-gray-200 px-1">.env</code> untuk mengaktifkan
            peta.
          </p>
          <div className="mt-4 text-sm text-nb-gray-500">
            {users.length} petugas terdeteksi
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Style toggle button */}
      <button
        type="button"
        onClick={() => setMapStyle((s) => s === 'streets' ? 'satellite' : 'streets')}
        className={cn(
          'absolute top-2 left-2 z-10 px-3 py-1.5 text-xs font-bold',
          'border-2 border-nb-black rounded-nb-base bg-white shadow-nb-sm',
          'hover:shadow-nb-md transition-all duration-150'
        )}
        aria-label="Ganti gaya peta"
      >
        {mapStyle === 'streets' ? 'Satelit' : 'Peta'}
      </button>

      {/* Keyframes for marker animations */}
      <style>{`
        @keyframes marker-pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.85; }
        }
        @keyframes marker-pulse-fast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .monitoring-marker {
            animation: none !important;
          }
        }
        .mapboxgl-popup-content {
          padding: 6px 10px;
          border: 2px solid #000;
          border-radius: 4px;
          box-shadow: 2px 2px 0 #000;
        }
      `}</style>
    </div>
  );
}
