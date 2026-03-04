/**
 * LocationTrail Component
 * Phase 2D: Polyline overlay on the map showing a user's GPS history.
 * Green segments = inside area, Purple = outside area.
 * Start (S) and End (E) markers, intermediate clickable dots.
 */

import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Marker, Polyline, Callout } from 'react-native-maps';
import type MapView from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getUserLocationHistory } from '../../services/api/monitoringApi';
import type { LocationHistoryPoint, LocationHistory } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationTrailProps {
  userId: string;
  date: string;
  shiftId?: string;
  mapRef?: React.RefObject<MapView | null>;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INSIDE_COLOR = '#15803D';
const OUTSIDE_COLOR = '#9333EA';

function buildPolylineSegments(
  points: LocationHistoryPoint[],
): { coordinates: { latitude: number; longitude: number }[]; color: string }[] {
  if (points.length < 2) { return []; }

  const segments: { coordinates: { latitude: number; longitude: number }[]; color: string }[] = [];
  let currentColor = points[0].is_within_area ? INSIDE_COLOR : OUTSIDE_COLOR;
  let currentCoords: { latitude: number; longitude: number }[] = [
    { latitude: points[0].latitude, longitude: points[0].longitude },
  ];

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    const ptColor = pt.is_within_area ? INSIDE_COLOR : OUTSIDE_COLOR;
    currentCoords.push({ latitude: pt.latitude, longitude: pt.longitude });

    if (ptColor !== currentColor || i === points.length - 1) {
      segments.push({ coordinates: currentCoords, color: currentColor });
      currentColor = ptColor;
      currentCoords = [{ latitude: pt.latitude, longitude: pt.longitude }];
    }
  }

  return segments;
}

function fitTrailBounds(
  mapRef: React.RefObject<MapView | null>,
  points: LocationHistoryPoint[],
): void {
  if (!mapRef.current || points.length === 0) { return; }
  const coords = points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  mapRef.current.fitToCoordinates(coords, {
    edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
    animated: true,
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeters(meters: number): string {
  if (meters >= 1000) { return `${(meters / 1000).toFixed(1)} km`; }
  return `${Math.round(meters)} m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationTrail({
  userId,
  date,
  shiftId,
  mapRef,
  onClose,
}: LocationTrailProps): React.JSX.Element {
  const [history, setHistory] = useState<LocationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getUserLocationHistory(userId, date, shiftId)
      .then(response => {
        if (cancelled) { return; }
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setHistory(response.data);
          if (mapRef) {
            fitTrailBounds(mapRef, response.data.points);
          }
        }
      })
      .catch(() => {
        if (!cancelled) { setError('Gagal memuat riwayat lokasi'); }
      })
      .finally(() => {
        if (!cancelled) { setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [userId, date, shiftId, mapRef]);

  const segments = useMemo(
    () => (history ? buildPolylineSegments(history.points) : []),
    [history],
  );

  const startPoint = history?.points[0] ?? null;
  const endPoint = history && history.points.length > 1
    ? history.points[history.points.length - 1]
    : null;
  const intermediatePoints = history?.points.slice(1, -1) ?? [];

  return (
    <>
      {/* Polyline segments */}
      {segments.map((seg, idx) => (
        <Polyline
          key={`seg-${idx}`}
          coordinates={seg.coordinates}
          strokeColor={seg.color}
          strokeWidth={3}
          lineDashPattern={undefined}
        />
      ))}

      {/* Start marker */}
      {startPoint && (
        <Marker
          coordinate={{ latitude: startPoint.latitude, longitude: startPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.endMarker, { backgroundColor: INSIDE_COLOR }]}>
            <Text style={styles.endMarkerText}>S</Text>
          </View>
        </Marker>
      )}

      {/* End marker */}
      {endPoint && (
        <Marker
          coordinate={{ latitude: endPoint.latitude, longitude: endPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.endMarker, { backgroundColor: nbColors.dangerDark }]}>
            <Text style={styles.endMarkerText}>E</Text>
          </View>
        </Marker>
      )}

      {/* Intermediate dot markers — only show every 5th to reduce clutter */}
      {intermediatePoints
        .filter((_, idx) => idx % 5 === 0)
        .map((pt, idx) => (
          <Marker
            key={`pt-${idx}`}
            coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.dotMarker,
                {
                  backgroundColor: pt.is_within_area
                    ? INSIDE_COLOR
                    : OUTSIDE_COLOR,
                },
              ]}
            />
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTime}>{formatTime(pt.logged_at)}</Text>
                {pt.accuracy != null && (
                  <Text style={styles.calloutDetail}>±{pt.accuracy.toFixed(0)}m</Text>
                )}
                {pt.battery_level != null && (
                  <Text style={styles.calloutDetail}>{pt.battery_level}%</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

      {/* Overlay header bar */}
      <View style={styles.headerBar}>
        {isLoading ? (
          <ActivityIndicator size="small" color={nbColors.white} />
        ) : error ? (
          <Text style={styles.headerText}>{error}</Text>
        ) : history ? (
          <Text style={styles.headerText} numberOfLines={1}>
            {history.user_name}  {date}  {formatMeters(history.total_distance_meters)}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityLabel="Tutup trail"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="close" size={18} color={nbColors.white} />
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  endMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.white,
    ...nbShadows.sm,
  },
  endMarkerText: {
    color: nbColors.white,
    fontSize: 10,
    fontWeight: nbTypography.fontWeight.bold,
  },
  dotMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nbColors.white,
  },
  callout: {
    backgroundColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    padding: nbSpacing.xs,
    minWidth: 60,
  },
  calloutTime: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  calloutDetail: {
    color: nbColors.gray['400'],
    fontSize: nbTypography.fontSize.xs,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  headerText: {
    flex: 1,
    color: nbColors.white,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  closeButton: {
    padding: nbSpacing.xs,
    flexShrink: 0,
  },
});
