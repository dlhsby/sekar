'use client';

/**
 * SimpleMonitoringMap — a minimal, reliable Mapbox map built on the exact
 * pattern proven to work in /map-test (token set in-effect, CSS imported in JS,
 * absolute-fill container). Renders worker pins coloured by status. The richer
 * MonitoringMap (boundaries, clusters, trails, filters) is reintroduced later.
 */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
}

// Token utilities only (no raw hex — ESLint no-inline-hex-colors).
const STATUS_VAR: Record<string, string> = {
  active: 'var(--color-status-active)',
  inactive: 'var(--color-status-idle)',
  outside_area: 'var(--color-status-outside)',
  missing: 'var(--color-status-missing)',
  offline: 'var(--color-status-offline)',
};

const SURABAYA: [number, number] = [112.7521, -7.2575];

export function SimpleMonitoringMap({ workers }: { workers: SimpleWorker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Init once.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'your-mapbox-token-here' || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: SURABAYA,
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      loadedRef.current = true;
      map.resize();
    });

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.resize()) : undefined;
    ro?.observe(containerRef.current);

    return () => {
      ro?.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync worker markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      for (const w of workers) {
        if (!w.lat || !w.lng) continue;
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '9999px';
        el.style.border = '2px solid var(--color-nb-black)';
        el.style.backgroundColor = STATUS_VAR[w.status] ?? 'var(--color-status-offline)';
        el.style.cursor = 'pointer';
        const marker = new mapboxgl.Marker(el)
          .setLngLat([w.lng, w.lat])
          .setPopup(new mapboxgl.Popup({ offset: 14, closeButton: false }).setText(w.full_name))
          .addTo(map);
        markersRef.current.push(marker);
      }
    };

    if (loadedRef.current) draw();
    else map.once('load', draw);
  }, [workers]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
