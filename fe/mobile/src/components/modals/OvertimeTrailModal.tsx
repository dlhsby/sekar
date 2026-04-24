/**
 * OvertimeTrailModal
 * Shows location tracking trail for an overtime shift on Google Maps
 * Features: refresh button, all intermediate markers, tappable callouts
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Polyline, Marker, Callout, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserLocationHistory } from '../../services/api/monitoringApi';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import type { LocationHistoryPoint } from '../../types/models.types';
import { calculateDistance } from '../../utils/gpsUtils';

const MARKER_DISTANCE_THRESHOLD_M = 15;

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const day = d.getDate();
  const month = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} ${hh}:${mm}:${ss}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  shiftId: string;
  startDatetime: string; // ISO datetime
  userName: string;
  areaName?: string;
}

export function OvertimeTrailModal({
  visible,
  onClose,
  userId,
  shiftId,
  startDatetime,
  userName,
  areaName,
}: Props): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const [points, setPoints] = useState<LocationHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  const date = useMemo(() => startDatetime.substring(0, 10), [startDatetime]);

  const loadPoints = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await getUserLocationHistory(userId, date, shiftId);
      if (response.data?.points) {
        setPoints(response.data.points);
      } else if (response.error) {
        setError(response.error);
      }
    } catch {
      setError('Gagal memuat rute lokasi');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, date, shiftId]);

  useEffect(() => {
    if (!visible) { return; }
    loadPoints();
  }, [visible, loadPoints]);

  const handleZoomIn = useCallback(() => {
    const region = currentRegion;
    if (!region) { return; }
    mapRef.current?.animateToRegion(
      { ...region, latitudeDelta: region.latitudeDelta / 2, longitudeDelta: region.longitudeDelta / 2 },
      200,
    );
  }, [currentRegion]);

  const handleZoomOut = useCallback(() => {
    const region = currentRegion;
    if (!region) { return; }
    mapRef.current?.animateToRegion(
      { ...region, latitudeDelta: region.latitudeDelta * 2, longitudeDelta: region.longitudeDelta * 2 },
      200,
    );
  }, [currentRegion]);

  const coordinates = useMemo(
    () => points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [points],
  );

  // Deduplicated marker points: keep start + end always; filter intermediates by distance threshold.
  // Also filter out any intermediate that is too close to the end marker to avoid overlap.
  const markerPoints = useMemo(() => {
    if (points.length <= 2) { return points; }
    const start = points[0];
    const end = points[points.length - 1];
    const intermediates: LocationHistoryPoint[] = [];
    let lastKept = start;
    for (const point of points.slice(1, -1)) {
      const distFromLast = calculateDistance(lastKept.latitude, lastKept.longitude, point.latitude, point.longitude);
      const distFromEnd = calculateDistance(point.latitude, point.longitude, end.latitude, end.longitude);
      if (distFromLast >= MARKER_DISTANCE_THRESHOLD_M && distFromEnd >= MARKER_DISTANCE_THRESHOLD_M) {
        intermediates.push(point);
        lastKept = point;
      }
    }
    return [start, ...intermediates, end];
  }, [points]);

  const initialRegion = useMemo(() => {
    if (coordinates.length === 0) {
      return { latitude: -7.2905, longitude: 112.7398, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    const lats = coordinates.map((c) => c.latitude);
    const lngs = coordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const paddingFactor = 1.5;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * paddingFactor, 0.005),
      longitudeDelta: Math.max((maxLng - minLng) * paddingFactor, 0.005),
    };
  }, [coordinates]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>RUTE LEMBUR</Text>
            <Text style={styles.headerSubtitle}>{userName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => loadPoints(true)}
            style={styles.refreshBtn}
            disabled={isLoading || isRefreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh rute"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={nbColors.primary} />
            ) : (
              <MaterialCommunityIcons
                name="refresh"
                size={22}
                color={isLoading ? nbColors.gray[400] : nbColors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>{points.length} titik lokasi</Text>
          {points.length > 0 && (
            <Text style={styles.statsText}>
              {new Date(points[0].logged_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' \u2192 '}
              {new Date(points[points.length - 1].logged_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {isLoading ? (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color={nbColors.primary} />
              <Text style={styles.loadingText}>Memuat rute...</Text>
            </View>
          ) : error ? (
            <View style={styles.centeredContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color={nbColors.gray[400]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : points.length === 0 ? (
            <View style={styles.centeredContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color={nbColors.gray[400]} />
              <Text style={styles.errorText}>Tidak ada data lokasi untuk lembur ini</Text>
            </View>
          ) : (
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={initialRegion}
                scrollEnabled
                zoomEnabled
                onRegionChangeComplete={setCurrentRegion}
              >
                <Polyline
                  coordinates={coordinates}
                  strokeColor={nbColors.primary}
                  strokeWidth={3}
                />

                {/* Start marker — always green */}
                {markerPoints.length > 0 && (
                  <Marker
                    key={`start-${markerPoints[0].logged_at}`}
                    coordinate={{ latitude: markerPoints[0].latitude, longitude: markerPoints[0].longitude }}
                    pinColor="green"
                    title="Mulai Lembur"
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutUser}>{userName}</Text>
                        <Text style={styles.calloutTitle}>Mulai Lembur</Text>
                        <Text style={styles.calloutText}>Waktu: {formatDateTime(markerPoints[0].logged_at)}</Text>
                        <Text style={styles.calloutText}>GPS: {markerPoints[0].latitude.toFixed(6)}, {markerPoints[0].longitude.toFixed(6)}</Text>
                        {markerPoints[0].accuracy != null && <Text style={styles.calloutText}>Akurasi: {Math.round(markerPoints[0].accuracy)}m</Text>}
                        {markerPoints[0].battery_level != null && <Text style={styles.calloutText}>Baterai: {markerPoints[0].battery_level}%</Text>}
                        <Text style={styles.calloutText}>
                          Area: {markerPoints[0].is_within_area
                            ? `Di Dalam Area${areaName ? ` (${areaName})` : ''}`
                            : 'Di Luar Area'}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                )}

                {/* Intermediate markers — always blue */}
                {markerPoints.slice(1, -1).map((point, idx) => (
                  <Marker
                    key={`mid-${point.logged_at}-${idx}`}
                    coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                    pinColor="blue"
                    title={formatDateTime(point.logged_at)}
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutUser}>{userName}</Text>
                        <Text style={styles.calloutTitle}>{formatDateTime(point.logged_at)}</Text>
                        <Text style={styles.calloutText}>Waktu: {formatDateTime(point.logged_at)}</Text>
                        <Text style={styles.calloutText}>GPS: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</Text>
                        {point.accuracy != null && <Text style={styles.calloutText}>Akurasi: {Math.round(point.accuracy)}m</Text>}
                        {point.battery_level != null && <Text style={styles.calloutText}>Baterai: {point.battery_level}%</Text>}
                        <Text style={styles.calloutText}>
                          Area: {point.is_within_area
                            ? `Di Dalam Area${areaName ? ` (${areaName})` : ''}`
                            : 'Di Luar Area'}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                ))}

                {/* End marker — always red */}
                {markerPoints.length > 1 && (
                  <Marker
                    key={`end-${markerPoints[markerPoints.length - 1].logged_at}`}
                    coordinate={{ latitude: markerPoints[markerPoints.length - 1].latitude, longitude: markerPoints[markerPoints.length - 1].longitude }}
                    pinColor="red"
                    title="Selesai Lembur"
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutUser}>{userName}</Text>
                        <Text style={styles.calloutTitle}>Selesai Lembur</Text>
                        <Text style={styles.calloutText}>Waktu: {formatDateTime(markerPoints[markerPoints.length - 1].logged_at)}</Text>
                        <Text style={styles.calloutText}>GPS: {markerPoints[markerPoints.length - 1].latitude.toFixed(6)}, {markerPoints[markerPoints.length - 1].longitude.toFixed(6)}</Text>
                        {markerPoints[markerPoints.length - 1].accuracy != null && <Text style={styles.calloutText}>Akurasi: {Math.round(markerPoints[markerPoints.length - 1].accuracy!)}m</Text>}
                        {markerPoints[markerPoints.length - 1].battery_level != null && <Text style={styles.calloutText}>Baterai: {markerPoints[markerPoints.length - 1].battery_level}%</Text>}
                        <Text style={styles.calloutText}>
                          Area: {markerPoints[markerPoints.length - 1].is_within_area
                            ? `Di Dalam Area${areaName ? ` (${areaName})` : ''}`
                            : 'Di Luar Area'}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                )}
              </MapView>

              {/* Zoom controls — matching monitoring screen FAB style */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={handleZoomIn}
                  accessibilityRole="button"
                  accessibilityLabel="Perbesar"
                >
                  <MaterialCommunityIcons name="plus" size={20} color={nbColors.black} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={handleZoomOut}
                  accessibilityRole="button"
                  accessibilityLabel="Perkecil"
                >
                  <MaterialCommunityIcons name="minus" size={20} color={nbColors.black} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.thick,
    borderBottomColor: nbColors.black,
    backgroundColor: nbColors.white,
    ...nbShadows.md,
  },
  closeBtn: {
    padding: nbSpacing.xs,
    marginRight: nbSpacing.sm,
  },
  refreshBtn: {
    padding: nbSpacing.xs,
    marginLeft: nbSpacing.sm,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.gray[50],
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray[300],
  },
  statsText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  mapContainer: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    right: nbSpacing.md,
    bottom: nbSpacing.xl,
    gap: nbSpacing.sm,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  loadingText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[500],
    textAlign: 'center',
    paddingHorizontal: nbSpacing.xl,
  },
  callout: {
    minWidth: 160,
    maxWidth: 220,
    padding: nbSpacing.xs,
  },
  calloutTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[700],
    marginTop: 1,
  },
  calloutUser: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: 2,
  },
});
