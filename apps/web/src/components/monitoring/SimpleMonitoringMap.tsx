'use client';

/**
 * SimpleMonitoringMap — the live monitoring map on Google Maps. Renders:
 *   - district + area boundary overlays (always, independent of live workers),
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
import { type MonitoringMode, DEFAULT_MODE } from '@/lib/monitoring/mapMode';
import {
  type MonitoringLayers,
  DEFAULT_LAYERS,
  showsBoundary,
  showsNodeMarker,
  showsWorkerPins,
  showsTeamBubbles,
  teamMembersOnly,
} from '@/lib/monitoring/layers';
import { NodeMarkerLayer, type NodeMarker } from './NodeMarkerLayer';
import { WorkerClusterLayer, type MapBounds } from './WorkerClusterLayer';
import type { TeamGroup } from '@/lib/monitoring/teamGrouping';
import { pinElement, KIND_DEFAULT_GLYPH, MARKER_NEUTRAL_OUTLINE } from '@/lib/monitoring/markers';
import { useThemeStore } from '@/stores/theme';

/** The current node's own pin (selected district at district scope / area at area scope). */
export interface CurrentNodeMarker {
  variant: 'district' | 'region' | 'location';
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
  /** Presence axes (ADR-050) — drive the pin colour via the shared standard. */
  lifecycle_state?: string | null;
  leave_reason?: 'cuti' | 'sakit' | 'izin' | 'libur' | null;
  team_id?: string | null;
  team_name?: string | null;
  team_color?: string | null;
  team_opacity?: number | null;
  team_icon?: string | null;
}

export interface SimpleMonitoringMapProps {
  /** Current drill scope — gates which boundary layers draw. */
  scope?: 'surabaya' | 'city' | 'district' | 'region' | 'location';
  nodeMarkers?: NodeMarker[];
  /** Geo id selected in the filter (district/kawasan/lokasi). Non-matching node
   *  bubbles are dimmed to spotlight the selection. Null = no geo filter. */
  activeGeoId?: string | null;
  onDrillNode?: (node: NodeMarker) => void;
  /** The current node's own pin (district/location) — opens detail on click, no drill. */
  currentNode?: CurrentNodeMarker | null;
  onNodeDetail?: (node: CurrentNodeMarker) => void;
  /** Opens a CHILD node's detail from its ⓘ badge (the pin body still drills). */
  onNodeMarkerDetail?: (node: NodeMarker) => void;
  /** Selected location id — at location scope only its boundary is drawn (on demand). */
  areaId?: string | null;
  /** Selected kawasan id — at region scope only this kawasan's boundary is drawn
   *  (other kawasan hidden), matching the drill-down narrowing. */
  regionId?: string | null;
  workers: SimpleWorker[];
  boundaries?: BoundariesResponse | null;
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  /** Which overlays to draw (district/kawasan/lokasi boundaries, petugas, team bubbles). */
  layers?: MonitoringLayers;
  /** Monitoring mode. `zoom` draws every tier in the subtree instead of one level. */
  mode?: MonitoringMode;
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
// Alpha for the district fill when tinted with its configured color.
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
 * Viewport culling — skip overlays the camera cannot see.
 *
 * Zoom mode draws every rayon, kawasan and lokasi at once, and the polygons cost
 * more than the pins. Culling makes zooming IN progressively cheaper, which is
 * the mode's actual interaction; a fully zoomed-out city view culls nothing by
 * definition, and that remains the worst case on purpose.
 *
 * Deliberately NOT clustering. Clustering was removed from this map on request
 * ("it hid people and confused operators"), so nothing here may hide a worker —
 * culling only defers what is off-screen, which panning brings straight back.
 */
type Extent = { south: number; west: number; north: number; east: number };

function extentOf(paths: google.maps.LatLngLiteral[]): Extent | null {
  if (paths.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of paths) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
  }
  return { south, west, north, east };
}

/** Bounding-box overlap. Surabaya never crosses the antimeridian, so a plain
 *  comparison is exact here; a wrapped viewport (west > east) disables culling
 *  rather than guessing. */
function intersects(e: Extent | null, b: MapBounds): boolean {
  if (!e) return true;
  if (b.west > b.east) return true;
  return e.south <= b.north && e.north >= b.south && e.west <= b.east && e.east >= b.west;
}

function pointInBounds(lat: number, lng: number, b: MapBounds): boolean {
  if (b.west > b.east) return true;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

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
  scope,
  nodeMarkers,
  activeGeoId,
  onDrillNode,
  currentNode,
  onNodeDetail,
  onNodeMarkerDetail,
  areaId,
  regionId,
  workers,
  boundaries,
  selectedId,
  onSelect,
  layers = DEFAULT_LAYERS,
  mode = DEFAULT_MODE,
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
  // Current viewport, or null until the map first settles. Null means "draw
  // everything" — which is what keeps this invisible in tests and on first paint.
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  // Workers render at EVERY level (city → district → kawasan → lokasi) as soon as
  // the personnel layer shows them — no scope/zoom gate. The geo node bubbles are
  // drawn alongside (never replaced), so the city view shows the district bubbles
  // AND the people on the ground at once.
  const renderWorkers = showsWorkerPins(layers.personnel);

  // "Tim saja" means only people who are ON a team; the other options show
  // everyone. Filtering here rather than inside the cluster layer keeps that
  // layer about RENDERING and this component about what is in scope.
  const personnelWorkers = useMemo(
    () => (teamMembersOnly(layers.personnel) ? workers.filter((w) => w.team_id) : workers),
    [workers, layers.personnel]
  );

  // Node markers carry their tier in `variant`, so the per-tier marker options
  // filter the list and NodeMarkerLayer stays unaware of layer settings.
  const visibleNodeMarkers = useMemo(() => {
    const allowed: Record<string, boolean> = {
      district: showsNodeMarker(layers.district),
      region: showsNodeMarker(layers.kawasan),
      location: showsNodeMarker(layers.lokasi),
      // No city row exists (Surabaya has no boundary polygon), so the summary
      // node is never gated.
      surabaya: true,
    };
    return (nodeMarkers ?? []).filter((n) => allowed[n.variant] !== false);
  }, [nodeMarkers, layers.district, layers.kawasan, layers.lokasi]);

  // Track viewport zoom so team-bubble collapse recomputes on pan/zoom.
  const syncViewport = useCallback((map: google.maps.Map) => {
    const z = map.getZoom();
    if (typeof z === 'number') setZoom(z);
  }, []);

  // Flatten boundary geometry into renderable pieces. Rayon polygons keep their
  // configured color so the map can tint the fill/border per rayon.
  const { districtPolys, regionPolys, areaPaths } = useMemo(() => {
    const districtPolys: (PolyStyle & { paths: google.maps.LatLngLiteral[] })[] = [];
    const regionPolys: (PolyStyle & { id: string; paths: google.maps.LatLngLiteral[] })[] = [];
    const areaPaths: (PolyStyle & { id: string; paths: google.maps.LatLngLiteral[] })[] = [];
    for (const district of boundaries?.districts ?? []) {
      const rs = boundaryStyle(district);
      geometryToPaths(district.boundary_polygon).forEach((p) => districtPolys.push({ paths: p, ...rs }));
      for (const region of district.regions ?? []) {
        const gs = boundaryStyle(region);
        geometryToPaths(region.boundary_polygon).forEach((p) =>
          regionPolys.push({ id: region.id, paths: p, ...gs })
        );
      }
      for (const area of district.areas) {
        const as = boundaryStyle(area);
        geometryToPaths(area.boundary_polygon).forEach((p) =>
          areaPaths.push({ id: area.id, paths: p, ...as })
        );
      }
    }
    return { districtPolys, regionPolys, areaPaths };
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
      districtPolys.forEach((poly) => poly.paths.forEach(extend));
      areaPaths.forEach((area) => area.paths.forEach(extend));
      workers.forEach((w) => w.lat && w.lng && extend({ lat: w.lat, lng: w.lng }));
      if (has) {
        map.fitBounds(bounds, 48);
        didFitRef.current = true;
      }
    },
    [districtPolys, areaPaths, workers]
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
    // Viewport bounds drive culling (below). Captured on idle rather than on
    // every camera event so panning doesn't re-render the overlay per frame.
    const b = map.getBounds();
    if (b) {
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      setBounds({ south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() });
    }
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
  // Scope-gate boundary polygons: district outlines from the city view down, area
  // outlines only once inside a district. At the top (Surabaya) the map shows just
  // the Surabaya node bubble.
  const isZoom = mode === 'zoom';
  const showDistrictPolys = scope !== 'surabaya';
  // Kawasan outlines: all of a district's kawasan at district scope; ONLY the drilled
  // kawasan once you're inside one (region scope) — the others hide so the view
  // narrows to that kawasan.
  // Zoom mode draws every tier of the subtree, so kawasan outlines are on from
  // the city view down rather than appearing only once you're inside a rayon.
  const showRegionPolys = isZoom || scope === 'district' || scope === 'region';
  const visibleRegionPolys = useMemo(
    () => (scope === 'region' && regionId ? regionPolys.filter((r) => r.id === regionId) : regionPolys),
    [regionPolys, scope, regionId]
  );
  // Lokasi outlines: the SELECTED location at location scope; at district/kawasan scope the
  // lokasi shown as node markers (direct lokasi under the district, or the kawasan's
  // lokasi) get their boundary drawn too, so drilling in reveals location shapes
  // immediately — not just after zooming to a single location.
  const showAreaBorders = isZoom || scope === 'location' || scope === 'district' || scope === 'region';
  // Ids of the lokasi currently drawn as node markers (variant 'location'); used to
  // draw exactly those lokasi's boundaries at district/kawasan scope.
  const nodeAreaIds = useMemo(
    () => new Set((nodeMarkers ?? []).filter((n) => n.variant === 'location').map((n) => n.id)),
    [nodeMarkers]
  );
  const visibleAreaPaths = useMemo(() => {
    if (scope === 'location' && areaId) return areaPaths.filter((a) => a.id === areaId);
    // Both modes draw exactly the lokasi that have a node marker, so the outlines
    // and the pins can never disagree about which lokasi are "in view". In zoom
    // mode that set is the whole subtree; in drill mode it is one level.
    // NB this reads the RAW `nodeMarkers`, not the layer-filtered list — hiding
    // markers must not take the boundaries with them.
    if (isZoom || scope === 'district' || scope === 'region')
      return areaPaths.filter((a) => nodeAreaIds.has(a.id));
    return areaPaths;
  }, [areaPaths, isZoom, scope, areaId, nodeAreaIds]);

  // ── Viewport culling ───────────────────────────────────────────────────────
  // Applied to what is DRAWN only; the un-culled arrays still drive fitToContent
  // and the boundary/marker agreement above, so panning never changes which
  // lokasi are considered in view — only which are currently painted.
  const cullPolys = useCallback(
    <T extends { paths: google.maps.LatLngLiteral[] }>(polys: T[]): T[] => {
      if (!bounds) return polys;
      return polys.filter((p) => intersects(extentOf(p.paths), bounds));
    },
    [bounds]
  );

  const drawnDistrictPolys = useMemo(() => cullPolys(districtPolys), [cullPolys, districtPolys]);
  const drawnRegionPolys = useMemo(() => cullPolys(visibleRegionPolys), [cullPolys, visibleRegionPolys]);
  const drawnAreaPaths = useMemo(() => cullPolys(visibleAreaPaths), [cullPolys, visibleAreaPaths]);

  // Worker pins: cull off-screen people, but NEVER the selected one — it can be
  // selected from the sidebar while off-camera, and the map pans to it right
  // after; dropping it would make the pin flicker out and back.
  const drawnWorkers = useMemo(() => {
    if (!bounds) return personnelWorkers;
    return personnelWorkers.filter(
      (w) => w.user_id === selectedId || pointInBounds(w.lat, w.lng, bounds)
    );
  }, [personnelWorkers, bounds, selectedId]);

  const drawnNodeMarkers = useMemo(() => {
    if (!bounds) return visibleNodeMarkers;
    return visibleNodeMarkers.filter((n) => pointInBounds(n.lat, n.lng, bounds));
  }, [visibleNodeMarkers, bounds]);

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
    // reads the same as the drill-node markers at every level (district/kawasan/lokasi).
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
        {/* Rayon boundaries — the district's own border_color + fill_color (ADR-045),
            drawn separately; sensible defaults only when unset. */}
        {showsBoundary(layers.district) && showDistrictPolys &&
          drawnDistrictPolys.map((poly, i) => (
            <Polygon
              key={`district-${i}`}
              paths={poly.paths}
              options={{
                strokeColor: poly.border_color ?? POLYGON_STYLES.district.stroke,
                strokeWeight: POLYGON_STYLES.district.strokeWidth,
                strokeOpacity: poly.border_opacity ?? 0.9,
                fillColor: poly.fill_color ?? POLYGON_STYLES.district.fill,
                fillOpacity: poly.fill_opacity ?? RAYON_FILL_ALPHA,
                clickable: false,
                zIndex: 1,
              }}
            />
          ))}

        {/* Kawasan (region) boundaries — the kawasan's own border_color +
            fill_color; drawn once you're inside a district. */}
        {showsBoundary(layers.kawasan) && showRegionPolys &&
          drawnRegionPolys.map((poly, i) => (
            <Polygon
              key={`region-${i}`}
              paths={poly.paths}
              options={{
                strokeColor: poly.border_color ?? POLYGON_STYLES.district.stroke,
                strokeWeight: 1.5,
                strokeOpacity: poly.border_opacity ?? 0.85,
                fillColor: poly.fill_color ?? POLYGON_STYLES.district.fill,
                fillOpacity: poly.fill_opacity ?? RAYON_FILL_ALPHA * 0.6,
                clickable: false,
                zIndex: 2,
              }}
            />
          ))}

        {/* Lokasi boundaries — the lokasi's own border_color + fill_color (one
            `lokasi` toggle); only the selected area at area scope (on-demand). */}
        {showsBoundary(layers.lokasi) && showAreaBorders &&
          drawnAreaPaths.map((area, i) => (
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

        {/* Geo node markers (Surabaya / district / kawasan / lokasi bubbles) — always
            drawn (the marker layer can't be hidden). At location scope nodeMarkers is
            empty, so nothing renders there. */}
        <NodeMarkerLayer nodes={drawnNodeMarkers} onDrill={onDrillNode} onDetail={onNodeMarkerDetail} zoom={zoom} activeGeoId={activeGeoId} />

        {/* Selected worker's movement trail (today) — a dashed path under the pins. */}
        {trail && trail.length >= 2 && (
          <Polyline
            path={trail}
            options={{
              strokeColor: POLYGON_STYLES.district.stroke,
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
            node bubbles at district/kawasan/location scope, no clustering. */}
        {renderWorkers && (
          <WorkerClusterLayer
            workers={drawnWorkers}
            zoom={zoom}
            selectedId={selectedId}
            onSelect={onSelect}
            onTeamClick={onTeamClick}
            teamBubbles={showsTeamBubbles(layers.personnel)}
          />
        )}

        {/* Current-node pin (the district/location you drilled into): a glyph teardrop
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
