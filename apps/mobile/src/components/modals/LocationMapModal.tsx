/**
 * LocationMapModal
 * Shows current GPS position and area boundary on a Google Maps view.
 * Opened when the user taps the Lokasi Anda card on HomeScreen.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { NBText } from '../nb/NBText';
import { NBModal } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  withAlpha,
} from '../../constants/nbTokens';
import type { GeoJsonGeometry } from '../../types/models.types';

interface AreaBoundary {
  gps_lat: number;
  gps_lng: number;
  boundary_polygon?: GeoJsonGeometry | null;
  name?: string;
}

interface LocationMapModalProps {
  visible: boolean;
  onClose: () => void;
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    isWithinArea: boolean;
    updatedAt: Date | null;
  };
  area?: AreaBoundary;
  /**
   * Optional footer action — when provided, renders a primary button below
   * the map. Used by RequestDetailScreen to launch Google Maps navigation.
   */
  footerActionLabel?: string;
  onFooterAction?: () => void;
  /**
   * Override the modal title. Defaults to "Lokasi Anda" (worker GPS context).
   * Pruning request callers pass "Lokasi Perantingan".
   */
  title?: string;
  /**
   * Hide the "di dalam / di luar area kerja" badge. The badge is meaningful
   * only for the worker clock-in flow; it makes no sense for a kecamatan
   * pruning request whose GPS is just a warga-supplied marker, not a worker
   * boundary check.
   */
  hideAreaStatus?: boolean;
  /**
   * Hide the "Diperbarui …" freshness line. Same rationale as above — a
   * pruning request's GPS is captured once at submit; it's not a moving
   * tracker that needs a freshness label.
   */
  hideUpdatedAt?: boolean;
  /**
   * Marker title shown when the user taps the pin. Defaults to "Lokasi Anda".
   */
  markerTitle?: string;
  /**
   * Custom pin for the USER marker (glyph + colour) — e.g. the worker's role
   * icon, matching the monitoring map. Omitted → the default red Google pin.
   */
  workerMarker?: { iconName: string; color: string };
  /**
   * Custom pin for the AREA marker (glyph + colour) — e.g. a rayon/kawasan/lokasi
   * icon. Omitted → the default green Google pin.
   */
  areaMarker?: { iconName: string; color: string };
  /** When provided, a refresh button appears in the header to re-read the GPS. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** A small teardrop pin (circle badge + downward tip) for react-native-maps. */
function MapPin({ iconName, color }: { iconName: string; color: string }): React.JSX.Element {
  return (
    <View style={pinStyles.wrap}>
      <View style={[pinStyles.badge, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={iconName} size={16} color={nbColors.white} />
      </View>
      <View style={[pinStyles.tip, { borderTopColor: color }]} />
    </View>
  );
}

function formatUpdatedAt(date: Date | null, t: (key: string, options?: Record<string, any>) => string): string {
  if (!date) return t('components:locationMap.notUpdated');
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return t('components:locationMap.justUpdated');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    const timeStr = t('common:time.minutesAgo', { count: diffMin });
    return t('components:locationMap.updated', { time: timeStr });
  }
  const diffHr = Math.floor(diffMin / 60);
  const timeStr = t('common:time.hoursAgo', { count: diffHr });
  return t('components:locationMap.updated', { time: timeStr });
}

const PADDING = 1.4; // extra padding factor around bounding box

/** Extract outer ring from GeoJSON Polygon and convert to LatLng array.
 *  Coerces to Number to handle TypeORM returning decimals as strings. */
function toLatLngArray(
  polygon: { coordinates: [number, number][][] },
): { latitude: number; longitude: number }[] {
  return (polygon.coordinates[0] ?? []).map(([lng, lat]) => ({
    latitude: Number(lat),
    longitude: Number(lng),
  }));
}

/** Compute a map region that fits all the given lat/lng points with padding */
function fitRegion(points: { latitude: number; longitude: number }[]): Region {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * PADDING, 0.002);
  const lngDelta = Math.max((maxLng - minLng) * PADDING, 0.002);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

// Map area boundary overlay — blue-700 tone; closest token is requestUnderReview (#2563EB)
// Boundary styling matches the monitoring map (`markerSpec` / BoundaryOverlay)
// rather than borrowing the pruning-request palette, so the polygon a worker sees
// around their own lokasi is the same one a supervisor sees around it.
const AREA_FILL_INSIDE = withAlpha(nbColors.statusActive, 0.12);
const AREA_FILL_OUTSIDE = withAlpha(nbColors.statusIdle, 0.12);
const AREA_STROKE_INSIDE = nbColors.statusActive;
const AREA_STROKE_OUTSIDE = nbColors.statusIdle;

export function LocationMapModal({
  visible,
  onClose,
  location,
  area,
  footerActionLabel,
  onFooterAction,
  title,
  hideAreaStatus = false,
  hideUpdatedAt = false,
  markerTitle,
  workerMarker,
  areaMarker,
  onRefresh,
  refreshing = false,
}: LocationMapModalProps) {
  const { t } = useTranslation();
  const defaultTitle = title ?? t('components:locationMap.defaultTitle');
  const defaultMarkerTitle = markerTitle ?? t('components:locationMap.defaultMarkerTitle');
  // Coerce — backend may emit decimal columns as strings via TypeORM, and
  // some callers pass numeric strings unintentionally. Treat NaN/null/undefined
  // uniformly as "no coords" so the renderer never calls .toFixed on a string.
  const lat =
    typeof location.latitude === 'number'
      ? location.latitude
      : location.latitude != null
      ? Number(location.latitude)
      : null;
  const lng =
    typeof location.longitude === 'number'
      ? location.longitude
      : location.longitude != null
      ? Number(location.longitude)
      : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  const accuracyWarning = location.accuracy !== null && location.accuracy > 50;

  // Coerce the AREA centre too — TypeORM emits decimal columns (e.g. a district's
  // center_lat/lng) as STRINGS, and react-native-maps' <Marker> throws "Value for
  // latitude cannot be cast from String to double" on a string coordinate. Doing
  // it here keeps every caller (clock-in, clock-out, home) safe.
  const areaLat = area?.gps_lat != null ? Number(area.gps_lat) : null;
  const areaLng = area?.gps_lng != null ? Number(area.gps_lng) : null;
  const hasAreaCoords =
    areaLat !== null && areaLng !== null && !isNaN(areaLat) && !isNaN(areaLng);

  const polygonCoords = useMemo(() => {
    const bp = area?.boundary_polygon;
    // Guard: undefined/null or a JSONB string not yet parsed (TypeORM serialization edge case)
    if (!bp || typeof bp !== 'object') return null;
    if (bp.type !== 'Polygon' && bp.type !== 'MultiPolygon') return null;
    const polygonArg: { coordinates: [number, number][][] } =
      bp.type === 'Polygon' ? bp : { coordinates: bp.coordinates[0] ?? [] };
    if (!Array.isArray(polygonArg.coordinates)) return null;
    const ring = polygonArg.coordinates[0];
    return ring && ring.length >= 3 ? toLatLngArray(polygonArg) : null;
  }, [area?.boundary_polygon]);

  const region = useMemo<Region | undefined>(() => {
    const points: { latitude: number; longitude: number }[] = [];

    if (hasCoords) {
      points.push({ latitude: lat!, longitude: lng! });
    }

    if (polygonCoords) {
      // Polygon available → use all vertices for precise bounding box
      points.push(...polygonCoords);
    } else if (area) {
      // No polygon → the centre point is all we can frame. The radius circle
      // that used to stand in here is retired (`radius_meters` is gone); drawing
      // one would invent a geofence the server does not share.
      points.push({ latitude: Number(area.gps_lat), longitude: Number(area.gps_lng) });
    }

    if (points.length === 0) return undefined;
    if (points.length === 1) {
      return {
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };
    }
    return fitRegion(points);
  }, [hasCoords, lat, lng, polygonCoords, area]);

  const footerContent = footerActionLabel && onFooterAction && hasCoords ? (
    <TouchableOpacity
      onPress={onFooterAction}
      accessibilityRole="button"
      accessibilityLabel={footerActionLabel}
      style={styles.footerAction}
      testID="location-modal-footer-action"
    >
      <MaterialCommunityIcons name="google-maps" size={20} color={nbColors.white} />
      <NBText variant="body" color="white" style={styles.footerActionText}>
        {footerActionLabel}
      </NBText>
    </TouchableOpacity>
  ) : null;

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={defaultTitle}
      type="sheet"
      noPadding
      footer={footerContent}
    >
      {/* Map container */}
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {/* Area boundary. Polygon or nothing: the radius circle that used to
                stand in as a fallback is retired (`radius_meters` is gone), and
                drawing one would invent a geofence the server does not share. */}
            {polygonCoords ? (
              <Polygon
                coordinates={polygonCoords}
                // Tinted by whether the worker is inside it — the same question
                // the badge above the map answers, so the two cannot disagree.
                fillColor={location.isWithinArea ? AREA_FILL_INSIDE : AREA_FILL_OUTSIDE}
                strokeColor={location.isWithinArea ? AREA_STROKE_INSIDE : AREA_STROKE_OUTSIDE}
                strokeWidth={2}
              />
            ) : null}

            {/* The area's own pin, so the boundary is identifiable even when
                the worker is far outside it (or the polygon is off-screen). */}
            {hasAreaCoords ? (
              <Marker
                coordinate={{ latitude: areaLat!, longitude: areaLng! }}
                title={area?.name}
                anchor={areaMarker ? { x: 0.5, y: 1 } : undefined}
                pinColor={areaMarker ? undefined : nbColors.statusActive}
              >
                {areaMarker ? <MapPin iconName={areaMarker.iconName} color={areaMarker.color} /> : undefined}
              </Marker>
            ) : null}

            {/* User location marker */}
            {hasCoords && (
              <Marker
                coordinate={{ latitude: lat!, longitude: lng! }}
                title={defaultMarkerTitle}
                anchor={workerMarker ? { x: 0.5, y: 1 } : undefined}
                description={
                  location.accuracy !== null
                    ? t('components:locationMap.accuracy', { value: Math.round(location.accuracy) })
                    : undefined
                }
              >
                {workerMarker ? <MapPin iconName={workerMarker.iconName} color={workerMarker.color} /> : undefined}
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.noLocationContainer}>
            <MaterialCommunityIcons
              name="map-marker-off"
              size={48}
              color={nbColors.gray400}
            />
            <NBText variant="body" color="gray500">
              {t('components:locationMap.areaNotAvailable')}
            </NBText>
          </View>
        )}
      </View>

      {/* Info strip — with padding since noPadding applies to the sheet container */}
      <View style={styles.infoStrip}>
        {hasCoords ? (
          <>
            <View style={styles.coordsRow}>
              <NBText
                variant="mono-sm"
                color="black"
                style={[styles.coordsFont, styles.coordsText]}
                accessibilityLabel={t('components:locationMap.coordAria', { lat: lat!.toFixed(6), lng: lng!.toFixed(6) })}
              >
                {lat!.toFixed(6)}, {lng!.toFixed(6)}
              </NBText>
              {onRefresh ? (
                <TouchableOpacity
                  onPress={onRefresh}
                  disabled={refreshing}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('attendance:infoCard.refreshLocation')}
                  testID="location-map-refresh"
                  style={styles.refreshButton}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={nbColors.black} />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={18} color={nbColors.black} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            {(location.accuracy !== null || !hideAreaStatus) ? (
              <View style={styles.infoRow}>
                {location.accuracy !== null && (
                  <NBText
                    variant="body-sm"
                    style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}
                  >
                    {accuracyWarning ? '⚠️ ' : ''}{t('components:locationMap.accuracy', { value: Math.round(location.accuracy) })}
                  </NBText>
                )}
                {!hideAreaStatus && (
                  <View
                    style={[
                      styles.areaBadge,
                      location.isWithinArea ? styles.areaBadgeInside : styles.areaBadgeOutside,
                    ]}
                  >
                    <NBText
                      variant="caption"
                      style={[
                        styles.areaBadgeTextBold,
                        location.isWithinArea
                          ? styles.areaBadgeTextInside
                          : styles.areaBadgeTextOutside,
                      ]}
                    >
                      {location.isWithinArea ? t('components:locationMap.withinWorkArea') : t('components:locationMap.outsideWorkArea')}
                    </NBText>
                  </View>
                )}
              </View>
            ) : null}
            {!hideUpdatedAt && (
              <NBText variant="caption" color="gray500" style={styles.updatedTopMargin}>
                {formatUpdatedAt(location.updatedAt, t)}
              </NBText>
            )}
          </>
        ) : (
          <NBText variant="body" color="gray500">
            {t('components:locationMap.gpsNotAvailable')}
          </NBText>
        )}
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.black,
    paddingVertical: nbSpacing[3],
    gap: nbSpacing[2],
  },
  footerActionText: {
    fontWeight: '700',
  },
  mapContainer: {
    height: 320,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.black,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.gray100,
    gap: nbSpacing.sm,
  },
  infoStrip: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.xs,
  },
  coordsFont: {
    // override mono-sm with platform monospace fallback
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  coordsText: {
    flexShrink: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: nbSpacing.xs,
  },
  accuracyText: {
    color: nbColors.gray700,
  },
  accuracyWarning: {
    color: nbColors.warning,
  },
  areaBadge: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
  },
  areaBadgeInside: {
    backgroundColor: withAlpha(nbColors.successDark, 0.12),
    borderColor: nbColors.successDark,
  },
  areaBadgeOutside: {
    backgroundColor: withAlpha(nbColors.statusIdle, 0.12),
    borderColor: nbColors.statusIdle,
  },
  areaBadgeTextBold: {
    fontWeight: '700',
  },
  areaBadgeTextInside: {
    color: nbColors.successDark,
  },
  areaBadgeTextOutside: {
    color: nbColors.statusIdle,
  },
  updatedTopMargin: {
    marginTop: nbSpacing.xs,
  },
});

const pinStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
