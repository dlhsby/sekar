/**
 * LocationMapModal
 * Shows current GPS position and area boundary on a Google Maps view.
 * Opened when the user taps the Lokasi Anda card on HomeScreen.
 */

import React, { useMemo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbShadows,
  nbBorderRadius,
  withAlpha,
} from '../../constants/nbTokens';

interface AreaBoundary {
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  /** GeoJSON Polygon as returned by the backend */
  boundary_polygon?: { type: 'Polygon'; coordinates: [number, number][][] } | null;
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
}

function formatUpdatedAt(date: Date | null): string {
  if (!date) return 'Belum diperbarui';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Diperbarui baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Diperbarui ${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  return `Diperbarui ${diffHr} jam lalu`;
}

const PADDING = 1.4; // extra padding factor around bounding box

/** Extract outer ring from GeoJSON Polygon and convert to LatLng array.
 *  Coerces to Number to handle TypeORM returning decimals as strings. */
function toLatLngArray(
  polygon: { type: 'Polygon'; coordinates: [number, number][][] },
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
const AREA_FILL = withAlpha(nbColors.requestUnderReview, 0.12);
const AREA_STROKE = nbColors.requestUnderReview;

export function LocationMapModal({
  visible,
  onClose,
  location,
  area,
  footerActionLabel,
  onFooterAction,
  title = 'Lokasi Anda',
  hideAreaStatus = false,
  hideUpdatedAt = false,
  markerTitle = 'Lokasi Anda',
}: LocationMapModalProps) {
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

  const polygonCoords = useMemo(() => {
    const ring = area?.boundary_polygon?.coordinates?.[0];
    return ring && ring.length >= 3 ? toLatLngArray(area!.boundary_polygon!) : null;
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
      // Radius fallback → expand bounding box to circle's cardinal edges
      const lat = Number(area.gps_lat);
      const lng = Number(area.gps_lng);
      const radius = Number(area.radius_meters);
      const latDeg = radius / 111320;
      const lngDeg = radius / (111320 * Math.cos((lat * Math.PI) / 180));
      points.push(
        { latitude: lat + latDeg, longitude: lng },
        { latitude: lat - latDeg, longitude: lng },
        { latitude: lat, longitude: lng + lngDeg },
        { latitude: lat, longitude: lng - lngDeg },
      );
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <NBText variant="h2" color="black">{title}</NBText>
              {area?.name && (
                <NBText variant="body-sm" color="gray600" style={styles.subtitleTop}>
                  {area.name}
                </NBText>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal"
            >
              <MaterialCommunityIcons name="close" size={24} color={nbColors.black} />
            </TouchableOpacity>
          </View>

          {/* Map */}
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
                {/* Area boundary — polygon if available, circle as fallback */}
                {polygonCoords ? (
                  <Polygon
                    coordinates={polygonCoords}
                    fillColor={AREA_FILL}
                    strokeColor={AREA_STROKE}
                    strokeWidth={2}
                  />
                ) : area ? (
                  <Circle
                    center={{ latitude: Number(area.gps_lat), longitude: Number(area.gps_lng) }}
                    radius={Number(area.radius_meters)}
                    fillColor={AREA_FILL}
                    strokeColor={AREA_STROKE}
                    strokeWidth={2}
                  />
                ) : null}

                {/* User location marker */}
                {hasCoords && (
                  <Marker
                    coordinate={{ latitude: lat!, longitude: lng! }}
                    title={markerTitle}
                    description={
                      location.accuracy !== null
                        ? `Akurasi: ±${Math.round(location.accuracy)}m`
                        : undefined
                    }
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.noLocationContainer}>
                <MaterialCommunityIcons
                  name="map-marker-off"
                  size={48}
                  color={nbColors.gray400}
                />
                <NBText variant="body" color="gray500">Lokasi tidak tersedia</NBText>
              </View>
            )}
          </View>

          {/* Info strip */}
          <View style={styles.infoStrip}>
            {hasCoords ? (
              <>
                <NBText
                  variant="mono-sm"
                  color="black"
                  style={styles.coordsFont}
                  accessibilityLabel={`Koordinat: ${lat!.toFixed(6)}, ${lng!.toFixed(6)}`}
                >
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </NBText>

                {(location.accuracy !== null || !hideAreaStatus) ? (
                  <View style={styles.infoRow}>
                    {location.accuracy !== null && (
                      <NBText variant="body-sm" style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}>
                        {accuracyWarning ? '⚠️ ' : ''}Akurasi: ±{Math.round(location.accuracy)}m
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
                          {location.isWithinArea ? 'Di dalam area kerja' : 'Di luar area kerja'}
                        </NBText>
                      </View>
                    )}
                  </View>
                ) : null}
                {!hideUpdatedAt && (
                  <NBText variant="caption" color="gray500" style={styles.updatedTopMargin}>
                    {formatUpdatedAt(location.updatedAt)}
                  </NBText>
                )}
              </>
            ) : (
              <NBText variant="body" color="gray500">GPS tidak aktif atau belum tersedia</NBText>
            )}
          </View>

          {footerActionLabel && onFooterAction && hasCoords ? (
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
          ) : null}
        </View>
      </Pressable>
    </Modal>
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
    borderTopWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  footerActionText: {
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: nbColors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.surface,
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '85%',
    flexShrink: 1,
    ...nbShadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  titleContainer: {
    flex: 1,
  },
  subtitleTop: {
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: 320,
    borderBottomWidth: nbBorders.base,
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
    padding: nbSpacing.md,
    gap: nbSpacing.xs,
  },
  coordsFont: {
    // override mono-sm with platform monospace fallback
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base,
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
