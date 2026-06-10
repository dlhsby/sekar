'use client';

/**
 * SimpleMonitoringMap — a reliable Mapbox map built on the exact pattern proven
 * to work in /map-test (token set in-effect, CSS imported in JS, absolute-fill
 * container). Renders:
 *   - rayon + area boundary overlays (always, independent of live workers),
 *   - area centre markers,
 *   - worker pins coloured by status, with selection (highlight + fly-to).
 */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { POLYGON_STYLES } from '@/lib/constants/monitoring';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
}

export interface SimpleMonitoringMapProps {
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
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

const BOUNDARY_LAYER_IDS = ['rayon-fill', 'rayon-line', 'area-fill', 'area-line'];
const BOUNDARY_SOURCE_IDS = ['rayon-src', 'area-src'];

function extendBounds(bounds: mapboxgl.LngLatBounds, geom: GeoJSON.Geometry | null) {
  if (!geom) return;
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring) =>
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]))
    );
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((poly) =>
      poly.forEach((ring) => ring.forEach(([lng, lat]) => bounds.extend([lng, lat])))
    );
  }
}

export function SimpleMonitoringMap({
  workers,
  boundaries,
  selectedId,
  onSelect,
}: SimpleMonitoringMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(new Map());
  const areaMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const didFitRef = useRef(false);
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
    const areaMarkers = areaMarkersRef.current;
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
      areaMarkers.forEach((m) => m.remove());
      areaMarkers.length = 0;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Boundary overlays (rayon + area polygons) + area centre markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      // Clear previous layers/sources/markers.
      BOUNDARY_LAYER_IDS.forEach((id) => map.getLayer(id) && map.removeLayer(id));
      BOUNDARY_SOURCE_IDS.forEach((id) => map.getSource(id) && map.removeSource(id));
      areaMarkersRef.current.forEach((m) => m.remove());
      areaMarkersRef.current = [];

      if (!boundaries?.rayons?.length) return;

      const rayonFeatures: GeoJSON.Feature[] = [];
      const areaFeatures: GeoJSON.Feature[] = [];
      const bounds = new mapboxgl.LngLatBounds();
      let hasGeometry = false;

      for (const rayon of boundaries.rayons) {
        if (rayon.boundary_polygon) {
          rayonFeatures.push({
            type: 'Feature',
            geometry: rayon.boundary_polygon,
            properties: { name: rayon.name },
          });
          extendBounds(bounds, rayon.boundary_polygon);
          hasGeometry = true;
        }
        for (const area of rayon.areas) {
          if (area.boundary_polygon) {
            areaFeatures.push({
              type: 'Feature',
              geometry: area.boundary_polygon,
              properties: { name: area.name },
            });
            extendBounds(bounds, area.boundary_polygon);
            hasGeometry = true;
          }
          // Area centre marker.
          if (typeof area.center_lat === 'number' && typeof area.center_lng === 'number') {
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.borderRadius = '4px';
            el.style.border = '2px solid var(--color-nb-black)';
            el.style.backgroundColor = area.is_understaffed
              ? 'var(--color-status-missing)'
              : 'var(--color-nb-warning)';
            el.style.color = 'var(--color-nb-black)';
            el.style.font = '700 10px/1 var(--font-mono, monospace)';
            el.textContent = 'A';
            const marker = new mapboxgl.Marker(el)
              .setLngLat([area.center_lng, area.center_lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 12, closeButton: false }).setText(area.name)
              )
              .addTo(map);
            areaMarkersRef.current.push(marker);
            bounds.extend([area.center_lng, area.center_lat]);
            hasGeometry = true;
          }
        }
      }

      if (rayonFeatures.length > 0) {
        map.addSource('rayon-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: rayonFeatures },
        });
        map.addLayer({
          id: 'rayon-fill',
          type: 'fill',
          source: 'rayon-src',
          paint: { 'fill-color': POLYGON_STYLES.rayon.fill, 'fill-opacity': POLYGON_STYLES.rayon.fillOpacity },
        });
        map.addLayer({
          id: 'rayon-line',
          type: 'line',
          source: 'rayon-src',
          paint: {
            'line-color': POLYGON_STYLES.rayon.stroke,
            'line-width': POLYGON_STYLES.rayon.strokeWidth,
            'line-dasharray': [...POLYGON_STYLES.rayon.dashArray],
          },
        });
      }

      if (areaFeatures.length > 0) {
        map.addSource('area-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: areaFeatures },
        });
        map.addLayer({
          id: 'area-fill',
          type: 'fill',
          source: 'area-src',
          paint: { 'fill-color': POLYGON_STYLES.area.fill, 'fill-opacity': POLYGON_STYLES.area.fillOpacity },
        });
        map.addLayer({
          id: 'area-line',
          type: 'line',
          source: 'area-src',
          paint: { 'line-color': POLYGON_STYLES.area.stroke, 'line-width': POLYGON_STYLES.area.strokeWidth },
        });
      }

      // Fit to boundaries once, so the map opens on the served region.
      if (hasGeometry && !didFitRef.current && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
        didFitRef.current = true;
      }
    };

    if (loadedRef.current) apply();
    else map.once('load', apply);
  }, [boundaries]);

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
      el.style.boxShadow = selected
        ? '0 0 0 3px var(--color-nb-white), 3px 3px 0 var(--color-nb-black)'
        : 'none';
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
