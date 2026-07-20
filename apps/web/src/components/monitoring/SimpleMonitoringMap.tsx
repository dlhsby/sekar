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
import { GoogleMap, Polygon, Polyline, InfoWindow } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { GoogleMapsGate } from '@/components/maps/GoogleMapsGate';
import { AdvancedMarker } from '@/components/maps/AdvancedMarker';
import { useMapId } from '@/lib/api/config';
import { POLYGON_STYLES } from '@/lib/constants/monitoring';
import { geometryToPaths } from '@/lib/maps/geometry';
import type { BoundariesResponse } from '@/lib/api/monitoring-types';
import { type MonitoringLayers, DEFAULT_LAYERS } from '@/lib/monitoring/layers';
import { NodeMarkerLayer, type NodeMarker } from './NodeMarkerLayer';
import { WorkerClusterLayer } from './WorkerClusterLayer';
import type { TeamGroup } from '@/lib/monitoring/teamGrouping';
import { pinElement, KIND_DEFAULT_GLYPH, MARKER_NEUTRAL_OUTLINE } from '@/lib/monitoring/markers';
import { useThemeStore } from '@/stores/theme';

/** The current node's own pin (selected rayon at rayon scope / area at area scope). */
export interface CurrentNodeMarker {
  variant: 'rayon' | 'region' | 'location';
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** The node's own fill_color — fills the drilled-in pin (matches the drill-node
   *  markers); null → white. */
  fill_color?: string | null;
}

export interface SimpleWorker {
  user_id: string;
  full_name: string;
  lat: number;
  lng: number;
  status: string;
  role: string;
  /** The role's configured marker icon (null → the client default glyph for the role). */
  role_marker_icon?: string | null;
  is_within_area: boolean;
  is_scheduled: boolean;
  team_id?: string | null;
  team_name?: string | null;
  team_color?: string | null;
  team_icon?: string | null;
}

export interface SimpleMonitoringMapProps {
  /**
   * `true` (location scope) → cluster individual worker pins. `false` → draw the
   * drill-down node markers (Surabaya / rayons / regions / locations) from `nodeMarkers`.
   */
  showWorkers: boolean;
  /** Current drill scope — gates which boundary layers draw. */
  scope?: 'surabaya' | 'city' | 'rayon' | 'region' | 'location';
  nodeMarkers?: NodeMarker[];
  /** Geo id selected in the filter (rayon/kawasan/lokasi). Non-matching node
   *  bubbles are dimmed to spotlight the selection. Null = no geo filter. */
  activeGeoId?: string | null;
  onDrillNode?: (node: NodeMarker) => void;
  /** The current node's own pin (rayon/location) — opens detail on click, no drill. */
  currentNode?: CurrentNodeMarker | null;
  onNodeDetail?: (node: CurrentNodeMarker) => void;
  /** Selected location id — at location scope only its boundary is drawn (on demand). */
  areaId?: string | null;
  /** Selected kawasan id — at region scope only this kawasan's boundary is drawn
   *  (other kawasan hidden), matching the drill-down narrowing. */
  regionId?: string | null;
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Which overlays to draw (rayon/kawasan/lokasi boundaries, petugas, team bubbles). */
  layers?: MonitoringLayers;
  /** Imperative focus target (from search / drill). `exact` sets the zoom
   *  absolutely (used to zoom OUT on drill-back); otherwise it only zooms in. */
  focusTarget?: { lat: number; lng: number; zoom?: number; exact?: boolean; key: number } | null;
  /** Selected worker's location trail (today) — drawn as a polyline when set. */
  trail?: google.maps.LatLngLiteral[] | null;
  /** Clicking a team marker opens its member list (no zoom-to-reveal). */
  onTeamClick?: (team: TeamGroup) => void;
}

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

// Concrete colors for Google overlay options (can't read CSS custom props).
// Native Google Maps gesture UX: greedy scroll/pinch zoom + drag pan (the camera
// controls are enough, so the +/- zoom buttons are off). The only on-map control
// is a single My-Location button (added natively in createLocateControl).
// Declutter the base map: hide third-party POIs (businesses, restaurants,
// buildings) and transit so only our own area markers + labels stand out. Park
// geometry stays visible (green context matters for a parks dept); only its
// labels/icons are muted.
// NOTE: JSON `styles` are IGNORED on a vector map (one with a `mapId`), which the
// AdvancedMarker layers require. These rules only take effect on the raster
// fallback (no Map ID configured). On the vector map the decluttering lives in the
// cloud Map Style(s) bound to the Map ID — both the light and dark styles carry it,
// so the map stays decluttered in either colorScheme.
const DECLUTTER_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeControl: false,
  zoomControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
  mapTypeId: 'roadmap',
  styles: DECLUTTER_STYLES,
};

const DEFAULT_ZOOM = 11;
// Alpha for the rayon fill when tinted with its configured color.
const RAYON_FILL_ALPHA = 0.18;

/** Per-entity boundary styling (ADR-045) — border + fill drawn separately. */
type PolyStyle = {
  border_color: string | null;
  fill_color: string | null;
  border_opacity: number | null;
  fill_opacity: number | null;
};
const boundaryStyle = (e: {
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
}): PolyStyle => ({
  border_color: e.border_color ?? null,
  fill_color: e.fill_color ?? null,
  border_opacity: e.border_opacity ?? null,
  fill_opacity: e.fill_opacity ?? null,
});

/**
 * Build a native-looking My-Location control button and register it in the map's
 * control stack (RIGHT_BOTTOM) so Google lays it out above the zoom control —
 * no overlap, Google-app-like UX. Pure DOM (runs once on map load).
 */
function createLocateControl(map: google.maps.Map, onClick: () => void, ariaLabel: string): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', ariaLabel);
  btn.title = ariaLabel;
  /* eslint-disable sekar-design/no-inline-hex-colors, sekar-design/prefer-nb-shadow-utility --
     Native Google Maps control chrome (mimics the built-in zoom control), not app UI. */
  Object.assign(btn.style, {
    width: '40px',
    height: '40px',
    margin: '0 10px 10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    border: '0',
    borderRadius: '2px',
    boxShadow: 'rgba(0,0,0,0.3) 0 1px 4px -1px',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  // Google-style crosshair location glyph.
  btn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  /* eslint-enable sekar-design/no-inline-hex-colors, sekar-design/prefer-nb-shadow-utility */
  btn.addEventListener('click', onClick);
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(btn);
}

function MonitoringMapInner({
  showWorkers,
  scope,
  nodeMarkers,
  activeGeoId,
  onDrillNode,
  currentNode,
  onNodeDetail,
  areaId,
  regionId,
  workers,
  boundaries,
  selectedId,
  onSelect,
  layers = DEFAULT_LAYERS,
  focusTarget,
  trail,
  onTeamClick,
}: SimpleMonitoringMapProps) {
  const { t } = useTranslation();
  // Vector Map ID — required for AdvancedMarkers (the node/worker layers). When
  // unset the map falls back to raster (JSON declutter styles apply) but the
  // marker layers won't render, so a Map ID must be configured for monitoring.
  const mapId = useMapId();
  // Light/dark base map: one Map ID carries both cloud styles; the map picks via
  // `colorScheme`. It can only be set at construction, so the map remounts when
  // the theme flips (keyed below). Falls back gracefully if the Map ID has no dark
  // style bound (Google just serves the light one).
  const theme = useThemeStore((s) => s.theme);
  const colorScheme = theme === 'dark' ? 'DARK' : 'LIGHT';
  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({ ...MAP_OPTIONS, mapId: mapId ?? undefined, colorScheme }),
    [mapId, colorScheme]
  );
  const mapRef = useRef<google.maps.Map | null>(null);
  const locateMeRef = useRef<() => void>(() => {});
  // The map instance that already has the My-Location control, so we add it once
  // per instance (a theme swap remounts the map → a fresh instance needs it again).
  const controlMapRef = useRef<google.maps.Map | null>(null);
  const didFitRef = useRef(false);
  // Last camera (center + zoom), captured on idle, so a Map-ID remount (theme
  // toggle) can restore the viewport instead of snapping back to the city. It is
  // read only inside handleMapLoad (a callback), never during render.
  const viewportRef = useRef<{ center: google.maps.LatLngLiteral; zoom: number } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Workers render immediately at every level that has them — area, rayon AND
  // kawasan — as soon as the Petugas layer is on (no zoom gate). The geo node
  // bubbles are drawn alongside (never replaced), so drilling into a rayon shows
  // its kawasan/lokasi AND the people on the ground at once.
  const renderWorkers =
    layers.petugas && (showWorkers || scope === 'rayon' || scope === 'region');

  // Track viewport zoom so team-bubble collapse recomputes on pan/zoom.
  const syncViewport = useCallback((map: google.maps.Map) => {
    const z = map.getZoom();
    if (typeof z === 'number') setZoom(z);
  }, []);

  // Flatten boundary geometry into renderable pieces. Rayon polygons keep their
  // configured color so the map can tint the fill/border per rayon.
  const { rayonPolys, regionPolys, areaPaths } = useMemo(() => {
    const rayonPolys: (PolyStyle & { paths: google.maps.LatLngLiteral[] })[] = [];
    const regionPolys: (PolyStyle & { id: string; paths: google.maps.LatLngLiteral[] })[] = [];
    const areaPaths: (PolyStyle & { id: string; paths: google.maps.LatLngLiteral[] })[] = [];
    for (const rayon of boundaries?.rayons ?? []) {
      const rs = boundaryStyle(rayon);
      geometryToPaths(rayon.boundary_polygon).forEach((p) => rayonPolys.push({ paths: p, ...rs }));
      for (const region of rayon.regions ?? []) {
        const gs = boundaryStyle(region);
        geometryToPaths(region.boundary_polygon).forEach((p) =>
          regionPolys.push({ id: region.id, paths: p, ...gs })
        );
      }
      for (const area of rayon.areas) {
        const as = boundaryStyle(area);
        geometryToPaths(area.boundary_polygon).forEach((p) =>
          areaPaths.push({ id: area.id, paths: p, ...as })
        );
      }
    }
    return { rayonPolys, regionPolys, areaPaths };
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
      rayonPolys.forEach((poly) => poly.paths.forEach(extend));
      areaPaths.forEach((area) => area.paths.forEach(extend));
      workers.forEach((w) => w.lat && w.lng && extend({ lat: w.lat, lng: w.lng }));
      if (has) {
        map.fitBounds(bounds, 48);
        didFitRef.current = true;
      }
    },
    [rayonPolys, areaPaths, workers]
  );

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      // A remount (theme → Map ID swap) has a saved viewport → restore it so the
      // map doesn't snap back to the city; skip the content fit. First-ever load
      // has none → fit to content.
      if (viewportRef.current) {
        map.setCenter(viewportRef.current.center);
        map.setZoom(viewportRef.current.zoom);
        didFitRef.current = true;
      } else {
        fitToContent(map);
      }
      syncViewport(map);
      // Add the My-Location control once per map INSTANCE. onLoad can fire twice
      // for the same map (Strict-Mode double-invoke) — guarded by identity — and a
      // theme remount yields a new instance whose control stack starts empty.
      if (controlMapRef.current !== map) {
        createLocateControl(map, () => locateMeRef.current(), t('monitoring:map.locateMeAriaLabel'));
        controlMapRef.current = map;
      }
    },
    [fitToContent, syncViewport, t]
  );

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    syncViewport(map);
    // Remember the camera so a Map-ID remount can restore it.
    const c = map.getCenter();
    const z = map.getZoom();
    if (c && typeof z === 'number') viewportRef.current = { center: { lat: c.lat(), lng: c.lng() }, zoom: z };
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
  useEffect(() => {
    locateMeRef.current = locateMe;
  }, [locateMe]);

  // Imperative focus (from search / drill): pan + zoom to a point.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.panTo({ lat: focusTarget.lat, lng: focusTarget.lng });
    if (focusTarget.zoom) {
      // `exact` sets the zoom absolutely (drill-back zoom-out); otherwise only
      // tighten (drill-in / focus-on-marker never zooms further out).
      map.setZoom(
        focusTarget.exact ? focusTarget.zoom : Math.max(map.getZoom() ?? 12, focusTarget.zoom)
      );
    }
  }, [focusTarget]);

  const selectedWorker =
    renderWorkers && selectedId ? workers.find((w) => w.user_id === selectedId) : null;
  // Scope-gate boundary polygons: rayon outlines from the city view down, area
  // outlines only once inside a rayon. At the top (Surabaya) the map shows just
  // the Surabaya node bubble.
  const showRayonPolys = scope !== 'surabaya';
  // Kawasan outlines: all of a rayon's kawasan at rayon scope; ONLY the drilled
  // kawasan once you're inside one (region scope) — the others hide so the view
  // narrows to that kawasan.
  const showRegionPolys = scope === 'rayon' || scope === 'region';
  const visibleRegionPolys = useMemo(
    () => (scope === 'region' && regionId ? regionPolys.filter((r) => r.id === regionId) : regionPolys),
    [regionPolys, scope, regionId]
  );
  // Lokasi outlines: the SELECTED location at location scope; at rayon/kawasan scope the
  // lokasi shown as node markers (direct lokasi under the rayon, or the kawasan's
  // lokasi) get their boundary drawn too, so drilling in reveals location shapes
  // immediately — not just after zooming to a single location.
  const showAreaBorders = scope === 'location' || scope === 'rayon' || scope === 'region';
  // Ids of the lokasi currently drawn as node markers (variant 'location'); used to
  // draw exactly those lokasi's boundaries at rayon/kawasan scope.
  const nodeAreaIds = useMemo(
    () => new Set((nodeMarkers ?? []).filter((n) => n.variant === 'location').map((n) => n.id)),
    [nodeMarkers]
  );
  const visibleAreaPaths = useMemo(() => {
    if (scope === 'location' && areaId) return areaPaths.filter((a) => a.id === areaId);
    if (scope === 'rayon' || scope === 'region')
      return areaPaths.filter((a) => nodeAreaIds.has(a.id));
    return areaPaths;
  }, [areaPaths, scope, areaId, nodeAreaIds]);

  // At location scope, frame the SELECTED location's boundary once it loads — a reliable
  // "focus in" that beats a fixed zoom (locations vary in size). Runs once per location.
  const fittedAreaRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || scope !== 'location' || !areaId) {
      fittedAreaRef.current = null;
      return;
    }
    if (fittedAreaRef.current === areaId) return;
    const b = new google.maps.LatLngBounds();
    let has = false;
    visibleAreaPaths.forEach((a) =>
      a.paths.forEach((p) => {
        b.extend(p);
        has = true;
      })
    );
    if (!has) return;
    map.fitBounds(b, 80);
    fittedAreaRef.current = areaId;
  }, [scope, areaId, visibleAreaPaths]);

  // The current-node pin as a stable AdvancedMarker element (rebuilt only when the
  // node's identity/variant/name changes), so drilling doesn't recreate it.
  const currentNodeEl = useMemo(() => {
    if (!currentNode) return null;
    // Filled with the node's own fill_color (neutral ring), so the drilled-in pin
    // reads the same as the drill-node markers at every level (rayon/kawasan/lokasi).
    return pinElement(
      KIND_DEFAULT_GLYPH[currentNode.variant],
      { outline: MARKER_NEUTRAL_OUTLINE, fill: currentNode.fill_color ?? undefined, big: true },
      { text: currentNode.name, className: 'node-marker-label', color: MARKER_NEUTRAL_OUTLINE }
    );
  }, [currentNode]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GoogleMap
        // Remount when the Map ID or colorScheme changes: both are immutable after
        // construction, so a light↔dark theme flip needs a fresh map. handleMapLoad
        // restores the preserved viewport so it doesn't snap back to the city.
        key={`${mapId ?? 'no-map-id'}-${colorScheme}`}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={SURABAYA}
        zoom={DEFAULT_ZOOM}
        onLoad={handleMapLoad}
        onIdle={handleIdle}
        options={mapOptions}
      >
        {/* Rayon boundaries — the rayon's own border_color + fill_color (ADR-045),
            drawn separately; sensible defaults only when unset. */}
        {layers.rayon && showRayonPolys &&
          rayonPolys.map((poly, i) => (
            <Polygon
              key={`rayon-${i}`}
              paths={poly.paths}
              options={{
                strokeColor: poly.border_color ?? POLYGON_STYLES.rayon.stroke,
                strokeWeight: POLYGON_STYLES.rayon.strokeWidth,
                strokeOpacity: poly.border_opacity ?? 0.9,
                fillColor: poly.fill_color ?? POLYGON_STYLES.rayon.fill,
                fillOpacity: poly.fill_opacity ?? RAYON_FILL_ALPHA,
                clickable: false,
                zIndex: 1,
              }}
            />
          ))}

        {/* Kawasan (region) boundaries — the kawasan's own border_color +
            fill_color; drawn once you're inside a rayon. */}
        {layers.kawasan && showRegionPolys &&
          visibleRegionPolys.map((poly, i) => (
            <Polygon
              key={`region-${i}`}
              paths={poly.paths}
              options={{
                strokeColor: poly.border_color ?? POLYGON_STYLES.rayon.stroke,
                strokeWeight: 1.5,
                strokeOpacity: poly.border_opacity ?? 0.85,
                fillColor: poly.fill_color ?? POLYGON_STYLES.rayon.fill,
                fillOpacity: poly.fill_opacity ?? RAYON_FILL_ALPHA * 0.6,
                clickable: false,
                zIndex: 2,
              }}
            />
          ))}

        {/* Lokasi boundaries — the lokasi's own border_color + fill_color (one
            `lokasi` toggle); only the selected area at area scope (on-demand). */}
        {layers.lokasi && showAreaBorders &&
          visibleAreaPaths.map((area, i) => (
            <Polygon
              key={`area-${area.id}-${i}`}
              paths={area.paths}
              options={{
                strokeColor: area.border_color ?? POLYGON_STYLES.area.stroke,
                strokeWeight: POLYGON_STYLES.area.strokeWidth,
                strokeOpacity: area.border_opacity ?? 1,
                fillColor: area.fill_color ?? POLYGON_STYLES.area.fill,
                fillOpacity: area.fill_opacity ?? POLYGON_STYLES.area.fillOpacity,
                clickable: false,
                zIndex: 3,
              }}
            />
          ))}

        {/* Geo node markers (Surabaya / rayon / kawasan / lokasi bubbles) — always
            drawn (the marker layer can't be hidden). At location scope nodeMarkers is
            empty, so nothing renders there. */}
        <NodeMarkerLayer nodes={nodeMarkers ?? []} onDrill={onDrillNode} zoom={zoom} activeGeoId={activeGeoId} />

        {/* Selected worker's movement trail (today) — a dashed path under the pins. */}
        {trail && trail.length >= 2 && (
          <Polyline
            path={trail}
            options={{
              strokeColor: POLYGON_STYLES.rayon.stroke,
              strokeOpacity: 0.9,
              strokeWeight: 3,
              icons: [
                {
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                  offset: '0',
                  repeat: '12px',
                },
              ],
              clickable: false,
              zIndex: 3,
            }}
          />
        )}

        {/* Worker pins (individual + optional team bubbles) — drawn ALONGSIDE the
            node bubbles at rayon/kawasan/location scope, no clustering. */}
        {renderWorkers && (
          <WorkerClusterLayer
            workers={workers}
            zoom={zoom}
            selectedId={selectedId}
            onSelect={onSelect}
            onTeamClick={onTeamClick}
            teamBubbles={layers.teamBubbles}
          />
        )}

        {/* Current-node pin (the rayon/location you drilled into): a glyph teardrop
            (kind default glyph) that opens the node's detail — never drills. */}
        {currentNode && currentNodeEl && (
          <AdvancedMarker
            key={`current-node-${currentNode.id}`}
            position={{ lat: currentNode.lat, lng: currentNode.lng }}
            content={currentNodeEl}
            onClick={() => onNodeDetail?.(currentNode)}
            zIndex={50}
            title={currentNode.name}
          />
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
        {/* My-Location is a native map control (stacked with zoom, bottom-right). */}
      </GoogleMap>
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
