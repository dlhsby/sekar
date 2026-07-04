'use client';

/**
 * SimpleMonitoringMap — the live monitoring map on Google Maps. Renders:
 *   - rayon + area boundary overlays (always, independent of live workers),
 *   - area centre markers (overdue-plant count badge when set),
 *   - worker pins coloured by status, with selection (highlight + pan-to).
 *
 * Wrapped in GoogleMapsGate so it degrades to a placeholder when no key is set.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polygon, InfoWindow } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { LocateFixed } from 'lucide-react';
import { GoogleMapsGate } from '@/components/maps/GoogleMapsGate';
import { POLYGON_STYLES } from '@/lib/constants/monitoring';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';
import type { AggregateNode } from '@/lib/api/monitoring-v2';
import { AggregateBubbleLayer } from './AggregateBubbleLayer';
import { WorkerClusterLayer, type MapBounds } from './WorkerClusterLayer';

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
}

export interface SimpleMonitoringMapProps {
  /**
   * `aggregate` → render summary bubbles from `aggregateNodes` (the light
   * default "Ringkasan"). `workers` → cluster the individual worker pins.
   */
  mode: 'aggregate' | 'workers';
  aggregateNodes?: AggregateNode[];
  onDrillNode?: (node: AggregateNode) => void;
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Phase 3-8: per-area overdue plant counts — area markers with overdue
   *  species turn danger-tinted and show the count. */
  overdueByArea?: Record<string, number> | null;
}

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

// Concrete colors for Google overlay options (can't read CSS custom props).
/* eslint-disable sekar-design/no-inline-hex-colors -- Google overlay options, not rendered style tokens */
const BLACK = '#1C1917';
const WHITE = '#FFFFFF';
const AREA_MARKER = '#D97706';
const AREA_MARKER_OVERDUE = '#DC2626';
/* eslint-enable sekar-design/no-inline-hex-colors */

// Native Google Maps controls + gesture UX: keep the native zoom control, use
// greedy one-finger/scroll panning like the Google Maps app, and a My-Location
// control (the JS API has no built-in one, so the button below drives it).
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapTypeId: 'roadmap',
};

const DEFAULT_ZOOM = 11;

/** GeoJSON Polygon/MultiPolygon → array of Google outer-ring paths. */
function geometryToPaths(geom: GeoJSON.Geometry | null): google.maps.LatLngLiteral[][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return [geom.coordinates[0].map(([lng, lat]) => ({ lat, lng }))];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map((poly) => poly[0].map(([lng, lat]) => ({ lat, lng })));
  }
  return [];
}

interface AreaPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  understaffed: boolean;
}

function MonitoringMapInner({
  mode,
  aggregateNodes,
  onDrillNode,
  workers,
  boundaries,
  selectedId,
  onSelect,
  overdueByArea,
}: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const didFitRef = useRef(false);
  const [hoverAreaId, setHoverAreaId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  // Track viewport zoom + bounds so supercluster recomputes on pan/zoom.
  const syncViewport = useCallback((map: google.maps.Map) => {
    const z = map.getZoom();
    if (typeof z === 'number') setZoom(z);
    const b = map.getBounds();
    if (b) {
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      setBounds({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
    }
  }, []);

  // Flatten boundary geometry into renderable pieces.
  const { rayonPaths, areaPaths, areaPins } = useMemo(() => {
    const rayonPaths: google.maps.LatLngLiteral[][] = [];
    const areaPaths: google.maps.LatLngLiteral[][] = [];
    const areaPins: AreaPin[] = [];
    for (const rayon of boundaries?.rayons ?? []) {
      geometryToPaths(rayon.boundary_polygon).forEach((p) => rayonPaths.push(p));
      for (const area of rayon.areas) {
        geometryToPaths(area.boundary_polygon).forEach((p) => areaPaths.push(p));
        if (typeof area.center_lat === 'number' && typeof area.center_lng === 'number') {
          areaPins.push({
            id: area.id,
            name: area.name,
            lat: area.center_lat,
            lng: area.center_lng,
            understaffed: area.is_understaffed,
          });
        }
      }
    }
    return { rayonPaths, areaPaths, areaPins };
  }, [boundaries]);

  // Fit the map to the served region once geometry/markers are available.
  const fitToContent = useCallback(
    (map: google.maps.Map) => {
      if (didFitRef.current) return;
      const bounds = new google.maps.LatLngBounds();
      let has = false;
      const extend = (p: google.maps.LatLngLiteral) => {
        bounds.extend(p);
        has = true;
      };
      rayonPaths.forEach((path) => path.forEach(extend));
      areaPaths.forEach((path) => path.forEach(extend));
      areaPins.forEach((a) => extend({ lat: a.lat, lng: a.lng }));
      workers.forEach((w) => w.lat && w.lng && extend({ lat: w.lat, lng: w.lng }));
      if (has) {
        map.fitBounds(bounds, 48);
        didFitRef.current = true;
      }
    },
    [rayonPaths, areaPaths, areaPins, workers]
  );

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitToContent(map);
      syncViewport(map);
    },
    [fitToContent, syncViewport]
  );

  const handleIdle = useCallback(() => {
    if (mapRef.current) syncViewport(mapRef.current);
  }, [syncViewport]);

  // Fit once content arrives after the map already loaded (async boundaries).
  useEffect(() => {
    if (mapRef.current) fitToContent(mapRef.current);
  }, [fitToContent]);

  // Pan to the selected worker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const w = workers.find((x) => x.user_id === selectedId);
    if (w?.lat && w?.lng) {
      map.panTo({ lat: w.lat, lng: w.lng });
      map.setZoom(Math.max(map.getZoom() ?? 14, 15));
    }
  }, [selectedId, workers]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const map = mapRef.current;
      if (!map) return;
      map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      map.setZoom(Math.max(map.getZoom() ?? 14, 15));
    });
  }, []);

  const selectedWorker =
    mode === 'workers' && selectedId ? workers.find((w) => w.user_id === selectedId) : null;
  const hoverArea = hoverAreaId ? areaPins.find((a) => a.id === hoverAreaId) : null;
  // Area centre pins only clutter the aggregate view (bubbles already carry
  // counts); keep them for the drilled worker view or when the plant overlay is on.
  const showAreaPins = mode === 'workers' || !!overdueByArea;

  const handleClusterZoom = useCallback((lat: number, lng: number, expansionZoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat, lng });
    map.setZoom(expansionZoom);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={SURABAYA}
        zoom={DEFAULT_ZOOM}
        onLoad={handleMapLoad}
        onIdle={handleIdle}
        options={MAP_OPTIONS}
      >
        {/* Rayon boundaries */}
        {rayonPaths.map((path, i) => (
          <Polygon
            key={`rayon-${i}`}
            paths={path}
            options={{
              strokeColor: POLYGON_STYLES.rayon.stroke,
              strokeWeight: POLYGON_STYLES.rayon.strokeWidth,
              strokeOpacity: 0.9,
              fillColor: POLYGON_STYLES.rayon.fill,
              fillOpacity: POLYGON_STYLES.rayon.fillOpacity,
              clickable: false,
              zIndex: 1,
            }}
          />
        ))}

        {/* Area boundaries */}
        {areaPaths.map((path, i) => (
          <Polygon
            key={`area-${i}`}
            paths={path}
            options={{
              strokeColor: POLYGON_STYLES.area.stroke,
              strokeWeight: POLYGON_STYLES.area.strokeWidth,
              strokeOpacity: 1,
              fillColor: POLYGON_STYLES.area.fill,
              fillOpacity: POLYGON_STYLES.area.fillOpacity,
              clickable: false,
              zIndex: 2,
            }}
          />
        ))}

        {/* Area centre markers */}
        {showAreaPins &&
          areaPins.map((area) => {
          const overdue = overdueByArea?.[area.id] ?? 0;
          const danger = overdue > 0 || area.understaffed;
          return (
            <Marker
              key={`area-pin-${area.id}`}
              position={{ lat: area.lat, lng: area.lng }}
              onMouseOver={() => setHoverAreaId(area.id)}
              onMouseOut={() => setHoverAreaId((cur) => (cur === area.id ? null : cur))}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: danger ? AREA_MARKER_OVERDUE : AREA_MARKER,
                fillOpacity: 1,
                strokeColor: BLACK,
                strokeWeight: 2,
              }}
              label={{
                text: overdue > 0 ? String(overdue) : 'A',
                color: WHITE,
                fontSize: '10px',
                fontWeight: '700',
              }}
              zIndex={3}
            />
          );
        })}

        {/* Aggregate bubbles (Ringkasan) or clustered worker pins (Semua Petugas). */}
        {mode === 'aggregate' ? (
          <AggregateBubbleLayer nodes={aggregateNodes ?? []} onDrill={onDrillNode} />
        ) : (
          <WorkerClusterLayer
            workers={workers}
            zoom={zoom}
            bounds={bounds}
            selectedId={selectedId}
            onSelect={onSelect}
            onClusterClick={handleClusterZoom}
          />
        )}

        {/* Info windows */}
        {hoverArea && (
          <InfoWindow
            position={{ lat: hoverArea.lat, lng: hoverArea.lng }}
            onCloseClick={() => setHoverAreaId(null)}
            options={{ disableAutoPan: true }}
          >
            <div className="text-xs font-semibold text-nb-black">
              {hoverArea.name}
              {(overdueByArea?.[hoverArea.id] ?? 0) > 0 && (
                <> · {t('monitoring:map.overduePlantLabel', { count: overdueByArea?.[hoverArea.id] })}</>
              )}
            </div>
          </InfoWindow>
        )}

        {selectedWorker?.lat && selectedWorker?.lng && (
          <InfoWindow
            position={{ lat: selectedWorker.lat, lng: selectedWorker.lng }}
            onCloseClick={() => onSelect?.(selectedWorker.user_id)}
            options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -18) }}
          >
            <div className="text-xs font-semibold text-nb-black">{selectedWorker.full_name}</div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Locate-me control */}
      <button
        type="button"
        onClick={locateMe}
        aria-label={t('monitoring:map.locateMeAriaLabel')}
        className="absolute bottom-6 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-100"
      >
        <LocateFixed className="h-5 w-5 text-nb-black" />
      </button>
    </div>
  );
}

export function SimpleMonitoringMap(props: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  return (
    <GoogleMapsGate
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-nb-gray-100 p-6 text-center">
          <p className="text-nb-body-sm text-nb-gray-600">
            {t('monitoring:map.unavailable')}
          </p>
        </div>
      }
    >
      <MonitoringMapInner {...props} />
    </GoogleMapsGate>
  );
}
