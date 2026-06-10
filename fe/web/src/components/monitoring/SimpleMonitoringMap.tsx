'use client';

/**
 * SimpleMonitoringMap — a reliable Mapbox map built on the exact pattern proven
 * to work in /map-test (token set in-effect, CSS imported in JS, absolute-fill
 * container). Renders worker pins coloured by status, supports selection
 * (highlight + fly-to). The richer boundary/cluster/trail machinery is layered
 * on later.
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

export interface SimpleMonitoringMapProps {
  workers: SimpleWorker[];
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
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

export function SimpleMonitoringMap({ workers, selectedId, onSelect }: SimpleMonitoringMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map());
  // Keep the latest onSelect without re-running the marker effect.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Init once.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'your-mapbox-token-here' || !containerRef.current) return;

    const markers = markersRef.current;
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
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
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
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      for (const w of workers) {
        if (!w.lat || !w.lng) continue;
        const el = document.createElement('div');
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '9999px';
        el.style.border = '2px solid var(--color-nb-black)';
        el.style.backgroundColor = STATUS_VAR[w.status] ?? 'var(--color-status-offline)';
        el.style.cursor = 'pointer';
        el.style.boxSizing = 'border-box';
        el.style.transition = 'transform 120ms ease, box-shadow 120ms ease';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current?.(w.user_id);
        });
        const marker = new mapboxgl.Marker(el)
          .setLngLat([w.lng, w.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(w.full_name))
          .addTo(map);
        markersRef.current.set(w.user_id, { marker, el });
      }
    };

    if (loadedRef.current) draw();
    else map.once('load', draw);
  }, [workers]);

  // Highlight + fly to the selected worker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ el }, id) => {
      const selected = id === selectedId;
      el.style.transform = selected ? 'scale(1.6)' : 'scale(1)';
      el.style.boxShadow = selected ? '0 0 0 3px var(--color-nb-white), 3px 3px 0 var(--color-nb-black)' : 'none';
      el.style.zIndex = selected ? '10' : '';
    });

    if (!selectedId) return;
    const worker = workers.find((w) => w.user_id === selectedId);
    if (worker?.lat && worker?.lng) {
      map.flyTo({ center: [worker.lng, worker.lat], zoom: Math.max(map.getZoom(), 14), speed: 1.2 });
    }
  }, [selectedId, workers]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
