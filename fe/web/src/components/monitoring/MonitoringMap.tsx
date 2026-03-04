'use client';

/**
 * MonitoringMap - Mapbox GL map for real-time user monitoring
 * Shows user markers with status colors and area polygons
 */

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { surabayaCenter } from '@/lib/maps/styles';
import { cn } from '@/lib/utils/cn';
import type { LiveUser, TrackingStatus } from '@/lib/api/monitoring';
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
  className?: string;
}

const STATUS_COLORS: Record<TrackingStatus, string> = {
  active: '#4ade80',
  inactive: '#fbbf24',
  outside_area: '#c084fc',
  missing: '#f87171',
  offline: '#9ca3af',
};

function createMarkerElement(user: LiveUser): HTMLElement {
  const el = document.createElement('div');
  const color = STATUS_COLORS[user.status] ?? '#9ca3af';

  el.className = 'monitoring-marker';
  el.style.cssText = `
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: ${color};
    border: 3px solid #000;
    box-shadow: 2px 2px 0 #000;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 900;
    color: #000;
    user-select: none;
    transition: transform 0.15s;
  `;

  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${user.full_name} - ${user.status}`);
  el.setAttribute('tabindex', '0');

  // Pulse animation for missing users
  if (user.status === 'missing') {
    el.style.animation = 'pulse 1.5s infinite';
  }

  return el;
}

export function MonitoringMap({
  users,
  areas = [],
  selectedUserId,
  onUserSelect,
  className = '',
}: MonitoringMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; popup: mapboxgl.Popup }>>(
    new Map()
  );
  const isLoadedRef = useRef(false);

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
        const el = existing.marker.getElement();
        const color = STATUS_COLORS[user.status] ?? '#9ca3af';
        el.style.backgroundColor = color;
        el.style.animation = user.status === 'missing' ? 'pulse 1.5s infinite' : '';
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
      {/* Pulse keyframe — injected inline for simplicity */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
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
