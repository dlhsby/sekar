/**
 * LocationMapModal
 * Shows current GPS position and area boundary on a Google Maps view.
 * Opened when the user taps the Lokasi Anda card on HomeScreen.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
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

const AREA_FILL = withAlpha('#1D4ED8', 0.12);
const AREA_STROKE = '#1D4ED8';

export function LocationMapModal({ visible, onClose, location, area }: LocationMapModalProps) {
  const hasCoords = location.latitude !== null && location.longitude !== null;
  const accuracyWarning = location.accuracy !== null && location.accuracy > 50;

  const polygonCoords = useMemo(() => {
    const ring = area?.boundary_polygon?.coordinates?.[0];
    return ring && ring.length >= 3 ? toLatLngArray(area!.boundary_polygon!) : null;
  }, [area?.boundary_polygon]);

  const region = useMemo<Region | undefined>(() => {
    const points: { latitude: number; longitude: number }[] = [];

    if (hasCoords) {
      points.push({ latitude: location.latitude!, longitude: location.longitude! });
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
  }, [hasCoords, location.latitude, location.longitude, polygonCoords, area]);

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
              <Text style={styles.title}>Lokasi Anda</Text>
              {area?.name && <Text style={styles.subtitle}>{area.name}</Text>}
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
                    coordinate={{ latitude: location.latitude!, longitude: location.longitude! }}
                    title="Lokasi Anda"
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
                  color={nbColors.gray['400']}
                />
                <Text style={styles.noLocationText}>Lokasi tidak tersedia</Text>
              </View>
            )}
          </View>

          {/* Info strip */}
          <View style={styles.infoStrip}>
            {hasCoords ? (
              <>
                <Text
                  style={styles.coordsText}
                  accessibilityLabel={`Koordinat: ${location.latitude!.toFixed(6)}, ${location.longitude!.toFixed(6)}`}
                >
                  {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
                </Text>

                <View style={styles.infoRow}>
                  {location.accuracy !== null && (
                    <Text style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}>
                      {accuracyWarning ? '⚠️ ' : ''}Akurasi: ±{Math.round(location.accuracy)}m
                    </Text>
                  )}
                  <View
                    style={[
                      styles.areaBadge,
                      location.isWithinArea ? styles.areaBadgeInside : styles.areaBadgeOutside,
                    ]}
                  >
                    <Text
                      style={[
                        styles.areaBadgeText,
                        location.isWithinArea
                          ? styles.areaBadgeTextInside
                          : styles.areaBadgeTextOutside,
                      ]}
                    >
                      {location.isWithinArea ? 'Di dalam area kerja' : 'Di luar area kerja'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.updatedAtText}>
                  {formatUpdatedAt(location.updatedAt)}
                </Text>
              </>
            ) : (
              <Text style={styles.noLocationText}>GPS tidak aktif atau belum tersedia</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    fontWeight: nbTypography.fontWeight.medium,
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
    backgroundColor: nbColors.gray['100'],
    gap: nbSpacing.sm,
  },
  noLocationText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  infoStrip: {
    padding: nbSpacing.md,
    gap: nbSpacing.xs,
  },
  coordsText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: nbSpacing.xs,
  },
  accuracyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
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
    backgroundColor: withAlpha('#15803D', 0.12),
    borderColor: '#15803D',
  },
  areaBadgeOutside: {
    backgroundColor: withAlpha('#D97706', 0.12),
    borderColor: '#D97706',
  },
  areaBadgeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
  },
  areaBadgeTextInside: {
    color: '#15803D',
  },
  areaBadgeTextOutside: {
    color: '#D97706',
  },
  updatedAtText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
    fontWeight: nbTypography.fontWeight.regular,
    marginTop: nbSpacing.xs,
  },
});
