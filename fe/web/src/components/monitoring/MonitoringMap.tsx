'use client';

/**
 * MonitoringMap - Mapbox GL map for real-time user monitoring
 * Shows user markers with status colors, boundary polygons, and location trails
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { surabayaCenter } from '@/lib/maps/styles';
import { cn } from '@/lib/utils/cn';
import { STATUS_COLORS } from '@/lib/constants/monitoring';
import type { LiveUser, LocationHistoryPoint, BoundariesResponse } from '@/lib/api/monitoring';
import {
  createMarkerElement,
  updateMarkerLabel,
  getMarkerAnimation,
  createCenterMarkerEl,
  createTrailPointEl,
  polygonCentroid,
  buildRayonFeatures,
  buildAreaFeatures,
  computeRayonBounds,
  POLYGON_STYLES,
  CENTER_MARKER_STYLES,
} from './monitoringMapHelpers';

// Set Mapbox token once
if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token && token !== 'your-mapbox-token-here') {
    mapboxgl.accessToken = token;
  }
}

export interface MonitoringMapLayerFlags {
  workers: boolean;
  rayons: boolean;
  areas: boolean;
}

export interface MonitoringMapProps {
  users: LiveUser[];
  selectedUserId: string | null;
  onUserSelect: (user: LiveUser) => void;
  trailPoints?: LocationHistoryPoint[];
  className?: string;
  boundaries?: BoundariesResponse;
  filters?: { rayon_id?: string; area_id?: string; user_id?: string };
  trailSelectedIndex?: number | null;
  onTrailPointClick?: (index: number) => void;
  showOnlyTrailUser?: boolean;
  onBoundaryClick?: (type: 'rayon' | 'area', id: string) => void;
  layerVisibility?: MonitoringMapLayerFlags;
}

type MarkerEntry = { marker: mapboxgl.Marker; popup: mapboxgl.Popup; user: LiveUser };

// ─── Component ────────────────────────────────────────────────────────────────

export function MonitoringMap({
  users,
  selectedUserId,
  onUserSelect,
  trailPoints,
  className = '',
  boundaries,
  filters,
  trailSelectedIndex,
  onTrailPointClick,
  showOnlyTrailUser,
  onBoundaryClick,
  layerVisibility,
}: MonitoringMapProps) {
  const showWorkers = layerVisibility?.workers ?? true;
  const showRayons = layerVisibility?.rayons ?? true;
  const showAreas = layerVisibility?.areas ?? true;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const boundaryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const trailMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const isLoadedRef = useRef(false);
  const zoomRef = useRef(12);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  const hasToken =
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN &&
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN !== 'your-mapbox-token-here';

  // ── Initialize map ──────────────────────────────────────────────────────────

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

    map.on('zoom', () => {
      zoomRef.current = map.getZoom();
      markersRef.current.forEach(({ marker, user }) => {
        updateMarkerLabel(marker.getElement(), user, zoomRef.current);
      });
    });

    mapRef.current = map;

    // The container can be 0×0 at init and settle afterwards (flex/absolute
    // layout, the page fade-in, tab switches). Mapbox measures the container
    // once, so without this the canvas stays blank. Observe + resize, and force
    // one resize on load to cover the first paint.
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
    }
    // The canvas can stick at its init size (e.g. measured mid fade-in). Force a
    // resize on load and again after the layout has settled.
    map.on('load', () => map.resize());
    map.once('idle', () => map.resize());
    const resizeTimers = [60, 250, 600].map((ms) => setTimeout(() => map.resize(), ms));

    return () => {
      resizeTimers.forEach(clearTimeout);
      resizeObserver?.disconnect();
      isLoadedRef.current = false;
      markersRef.current.forEach(({ marker, popup }) => {
        popup.remove();
        marker.remove();
      });
      markersRef.current.clear();
      boundaryMarkersRef.current.forEach((m) => m.remove());
      boundaryMarkersRef.current = [];
      trailMarkersRef.current.forEach((m) => m.remove());
      trailMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken]);

  // ── Update user markers ─────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const trailUserId = trailPoints?.length && trailPoints.length > 0 ? selectedUserId : null;

    // When workers layer is hidden, drop every marker and short-circuit.
    if (!showWorkers) {
      markersRef.current.forEach(({ marker, popup }) => {
        popup.remove();
        marker.remove();
      });
      markersRef.current.clear();
      return;
    }

    const currentIds = new Set(users.map((u) => u.id));

    markersRef.current.forEach(({ marker, popup }, id) => {
      if (!currentIds.has(id)) {
        popup.remove();
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    users.forEach((user) => {
      if (!user.latitude || !user.longitude || (user.latitude === 0 && user.longitude === 0))
        return;

      const opacity = showOnlyTrailUser && trailUserId && user.id !== trailUserId ? 0.3 : 1;
      const existing = markersRef.current.get(user.id);

      if (existing) {
        existing.marker.setLngLat([user.longitude, user.latitude]);
        const el = existing.marker.getElement();
        el.style.opacity = String(opacity);
        const dot = el.querySelector('.monitoring-marker') as HTMLElement;
        if (dot) {
          dot.style.backgroundColor = STATUS_COLORS[user.status] ?? '#6B7280';
          dot.style.borderStyle = user.status === 'outside_area' ? 'dashed' : 'solid';
          dot.style.animation = getMarkerAnimation(user.status)
            .replace('animation: ', '')
            .replace(';', '');
        }
        updateMarkerLabel(el, user, zoomRef.current);
        existing.user = user;
        return;
      }

      const el = createMarkerElement(user, zoomRef.current, opacity);
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

      el.addEventListener('mouseenter', () =>
        popup.setLngLat([user.longitude, user.latitude]).addTo(map)
      );
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', () => onUserSelect(user));
      el.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') onUserSelect(user);
      });

      markersRef.current.set(user.id, { marker, popup, user });
    });
  }, [users, onUserSelect, trailPoints, selectedUserId, showOnlyTrailUser, showWorkers]);

  // ── Fly to selected user ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !selectedUserId) return;
    const user = users.find((u) => u.id === selectedUserId);
    if (!user?.latitude || !user?.longitude) return;
    mapRef.current.flyTo({ center: [user.longitude, user.latitude], zoom: 16, duration: 800 });
  }, [selectedUserId, users]);

  // ── Draw boundary polygons + center markers ─────────────────────────────────

  const drawBoundaries = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !boundaries) return;

    const layers = ['rayon-fill', 'rayon-line', 'area-fill', 'area-line', 'area-understaffed-line'];
    const sources = ['rayons', 'areas'];
    layers.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    sources.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
    boundaryMarkersRef.current.forEach((m) => m.remove());
    boundaryMarkersRef.current = [];

    const rayonFeatures = buildRayonFeatures(boundaries);
    const areaFeatures = buildAreaFeatures(boundaries);

    if (showRayons && rayonFeatures.length > 0) {
      map.addSource('rayons', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: rayonFeatures },
      });
      map.addLayer({
        id: 'rayon-fill',
        type: 'fill',
        source: 'rayons',
        paint: {
          'fill-color': POLYGON_STYLES.rayon.fill,
          'fill-opacity': POLYGON_STYLES.rayon.fillOpacity,
        },
      });
      map.addLayer({
        id: 'rayon-line',
        type: 'line',
        source: 'rayons',
        paint: {
          'line-color': POLYGON_STYLES.rayon.stroke,
          'line-width': POLYGON_STYLES.rayon.strokeWidth,
          'line-dasharray': [...POLYGON_STYLES.rayon.dashArray],
        },
      });
    }

    if (showAreas && areaFeatures.length > 0) {
      map.addSource('areas', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: areaFeatures },
      });
      map.addLayer({
        id: 'area-fill',
        type: 'fill',
        source: 'areas',
        paint: {
          'fill-color': POLYGON_STYLES.area.fill,
          'fill-opacity': POLYGON_STYLES.area.fillOpacity,
        },
      });
      map.addLayer({
        id: 'area-line',
        type: 'line',
        source: 'areas',
        filter: ['!', ['get', 'is_understaffed']],
        paint: {
          'line-color': POLYGON_STYLES.area.stroke,
          'line-width': POLYGON_STYLES.area.strokeWidth,
        },
      });
      map.addLayer({
        id: 'area-understaffed-line',
        type: 'line',
        source: 'areas',
        filter: ['==', ['get', 'is_understaffed'], true],
        paint: { 'line-color': '#DC2626', 'line-width': 3 },
      });
    }

    boundaries.rayons.forEach((rayon) => {
      const center = polygonCentroid(rayon.boundary_polygon, rayon.center_lat, rayon.center_lng);
      if (showRayons && center) {
        const tooltip = `Rayon ${rayon.name} — ${rayon.area_count} area${rayon.is_understaffed ? ' (kekurangan staf)' : ''}`;
        const el = createCenterMarkerEl(
          rayon.code?.slice(0, 2) ?? 'R',
          CENTER_MARKER_STYLES.rayon.size,
          CENTER_MARKER_STYLES.rayon.bg,
          tooltip
        );
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 20 })
          .setHTML(`<div style="font-weight:700;font-size:12px;">Rayon ${rayon.name}</div>
                    <div style="font-size:11px;color:#666;">${rayon.area_count} area</div>
                    ${rayon.is_understaffed ? '<div style="font-size:11px;color:#DC2626;">Kekurangan staf</div>' : ''}`);
        el.addEventListener('mouseenter', () => popup.setLngLat(center).addTo(map));
        el.addEventListener('mouseleave', () => popup.remove());
        el.addEventListener('click', () => onBoundaryClick?.('rayon', rayon.id));
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onBoundaryClick?.('rayon', rayon.id);
        });
        boundaryMarkersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(center).addTo(map)
        );
      }

      rayon.areas.forEach((area) => {
        if (!showAreas) return;
        const aCenter = polygonCentroid(area.boundary_polygon, area.center_lat, area.center_lng);
        if (!aCenter) return;
        const aTooltip = `${area.name} — ${area.assigned_count} petugas${area.is_understaffed ? ' (kekurangan)' : ''}`;
        const aEl = createCenterMarkerEl(
          'A',
          CENTER_MARKER_STYLES.area.size,
          CENTER_MARKER_STYLES.area.bg,
          aTooltip
        );
        const aPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 16 })
          .setHTML(`<div style="font-weight:700;font-size:12px;">${area.name}</div>
                    <div style="font-size:11px;color:#666;">${rayon.name} — ${area.assigned_count} petugas</div>
                    ${area.is_understaffed ? '<div style="font-size:11px;color:#DC2626;">Kekurangan staf</div>' : ''}`);
        aEl.addEventListener('mouseenter', () => aPopup.setLngLat(aCenter).addTo(map));
        aEl.addEventListener('mouseleave', () => aPopup.remove());
        aEl.addEventListener('click', () => onBoundaryClick?.('area', area.id));
        aEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onBoundaryClick?.('area', area.id);
        });
        boundaryMarkersRef.current.push(
          new mapboxgl.Marker({ element: aEl, anchor: 'center' }).setLngLat(aCenter).addTo(map)
        );
      });
    });
  }, [boundaries, onBoundaryClick, showRayons, showAreas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isLoadedRef.current) {
      drawBoundaries();
    } else {
      map.once('load', drawBoundaries);
    }
  }, [drawBoundaries]);

  // ── Style toggle ────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const url =
      mapStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/streets-v12';
    map.setStyle(url);
    map.once('style.load', () => {
      drawBoundaries();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // ── Trail polyline + point markers ──────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    trailMarkersRef.current.forEach((m) => m.remove());
    trailMarkersRef.current = [];
    ['trail-inside', 'trail-outside'].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });

    if (!trailPoints || trailPoints.length < 2) return;

    const insideCoords: [number, number][] = [];
    const outsideCoords: [number, number][] = [];

    for (let i = 0; i < trailPoints.length - 1; i++) {
      const p1 = trailPoints[i];
      const p2 = trailPoints[i + 1];
      const c1: [number, number] = [p1.longitude, p1.latitude];
      const c2: [number, number] = [p2.longitude, p2.latitude];
      if (p1.is_within_area && p2.is_within_area) {
        insideCoords.push(c1, c2);
      } else {
        outsideCoords.push(c1, c2);
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

    trailPoints.forEach((pt, idx) => {
      const el = createTrailPointEl(
        idx === 0,
        idx === trailPoints.length - 1,
        pt.is_within_area,
        trailSelectedIndex === idx
      );
      el.addEventListener('click', () => onTrailPointClick?.(idx));
      el.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') onTrailPointClick?.(idx);
      });
      trailMarkersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pt.longitude, pt.latitude])
          .addTo(map)
      );
    });
  }, [trailPoints, trailSelectedIndex, onTrailPointClick]);

  // ── Pan to trail selected index ─────────────────────────────────────────────

  useEffect(() => {
    if (trailSelectedIndex == null || !mapRef.current) return;
    const pt = trailPoints?.[trailSelectedIndex];
    if (pt) mapRef.current.panTo([pt.longitude, pt.latitude], { duration: 400 });
  }, [trailSelectedIndex, trailPoints]);

  // ── Auto-focus on filter changes ────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    if (filters?.user_id) {
      const user = users.find((u) => u.id === filters.user_id);
      if (user?.latitude && user?.longitude) {
        map.flyTo({ center: [user.longitude, user.latitude], zoom: 17, duration: 800 });
      }
      return;
    }

    if (filters?.area_id && boundaries) {
      for (const rayon of boundaries.rayons) {
        const area = rayon.areas.find((a) => a.id === filters.area_id);
        if (area) {
          const center = polygonCentroid(area.boundary_polygon, area.center_lat, area.center_lng);
          if (center) map.flyTo({ center, zoom: 15, duration: 800 });
          return;
        }
      }
      return;
    }

    if (filters?.rayon_id && boundaries) {
      const result = computeRayonBounds(boundaries, filters.rayon_id);
      if (result) {
        if (result.bounds[0][0] !== 0) {
          map.fitBounds(result.bounds, { padding: 48, duration: 800 });
        } else if (result.center) {
          map.flyTo({ center: result.center, zoom: 14, duration: 800 });
        }
      }
      return;
    }

    map.flyTo({ center: surabayaCenter, zoom: 12, duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.rayon_id, filters?.area_id, filters?.user_id]);

  // ── No token fallback ───────────────────────────────────────────────────────

  if (!hasToken) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-nb-gray-100 border-4 border-nb-black',
          className
        )}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-4">&#128506;</div>
          <h3 className="font-bold text-lg mb-2">Token Mapbox Belum Dikonfigurasi</h3>
          <p className="text-sm text-nb-gray-600 max-w-xs">
            Tambahkan{' '}
            <code className="font-mono bg-nb-gray-200 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> di file{' '}
            <code className="font-mono bg-nb-gray-200 px-1">.env</code> untuk mengaktifkan peta.
          </p>
          <div className="mt-4 text-sm text-nb-gray-500">{users.length} petugas terdeteksi</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div ref={containerRef} className="absolute inset-0" />

      <button
        type="button"
        onClick={() => setMapStyle((s) => (s === 'streets' ? 'satellite' : 'streets'))}
        className={cn(
          'absolute top-2 left-2 z-10 px-3 py-1.5 text-xs font-bold',
          'border-2 border-nb-black rounded-nb-base bg-white shadow-nb-sm',
          'hover:shadow-nb-md transition-all duration-150'
        )}
        aria-label="Ganti gaya peta"
      >
        {mapStyle === 'streets' ? 'Satelit' : 'Peta'}
      </button>

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
          .monitoring-marker { animation: none !important; }
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
