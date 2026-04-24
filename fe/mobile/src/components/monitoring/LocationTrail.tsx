/**
 * LocationTrail Component
 * Phase 2D: Polyline overlay showing GPS history trail.
 * Enhanced with date picker, hide-others toggle, flag markers, clickable points.
 */

import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Polyline, Callout } from 'react-native-maps';
import type MapView from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
  nbSpacing,
} from '../../constants/nbTokens';
import { getUserLocationHistory } from '../../services/api/monitoringApi';
import { TrailControlBar } from './TrailControlBar';
import { TrailInfoBar } from './TrailInfoBar';
import type { LocationHistoryPoint, LocationHistory } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationTrailProps {
  userId: string;
  date: string;
  shiftId?: string;
  mapRef?: React.RefObject<MapView | null>;
  onClose: () => void;
  onHideOthersChange?: (hide: boolean) => void;
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
    edgePadding: { top: 100, right: 40, bottom: 120, left: 40 },
    animated: true,
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeFull(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const MAX_INTERMEDIATE_MARKERS = 50;

/** Returns every Nth intermediate point so we never exceed the marker limit. */
function sampleIntermediatePoints(
  points: LocationHistoryPoint[],
): { point: LocationHistoryPoint; originalIndex: number }[] {
  if (points.length === 0) { return []; }
  const step = Math.ceil(points.length / MAX_INTERMEDIATE_MARKERS);
  return points
    .map((point, originalIndex) => ({ point, originalIndex }))
    .filter((_, i) => i % step === 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationTrail({
  userId,
  date: initialDate,
  shiftId: initialShiftId,
  mapRef,
  onClose,
  onHideOthersChange,
}: LocationTrailProps): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<LocationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentShiftId, setCurrentShiftId] = useState(initialShiftId);
  const [hideOthers, setHideOthers] = useState(false);

  // Defer map-child rendering by one animation frame so the Android bridge
  // has time to stabilize before we add Polyline/Marker children to the MapView.
  useEffect(() => {
    const rafId = requestAnimationFrame(() => { setMounted(true); });
    return () => { cancelAnimationFrame(rafId); };
  }, []);

  // Fetch history when date/shift changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getUserLocationHistory(userId, currentDate, currentShiftId)
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
  }, [userId, currentDate, currentShiftId, mapRef]);

  const handleDateChange = useCallback((date: string) => {
    setCurrentDate(date);
    setCurrentShiftId(undefined);
  }, []);

  const handleHideOthersToggle = useCallback(() => {
    setHideOthers(prev => {
      const next = !prev;
      onHideOthersChange?.(next);
      return next;
    });
  }, [onHideOthersChange]);

  const handleClose = useCallback(() => {
    onHideOthersChange?.(false);
    onClose();
  }, [onClose, onHideOthersChange]);

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
      {/* Polyline segments — only rendered after mount to avoid Android bridge race */}
      {mounted && !isLoading && segments.map((seg, idx) => (
        <Polyline
          key={`seg-${idx}-${seg.color}`}
          coordinates={seg.coordinates}
          strokeColor={seg.color}
          strokeWidth={3}
        />
      ))}

      {/* Start marker - green flag */}
      {mounted && !isLoading && startPoint && (
        <Marker
          coordinate={{ latitude: startPoint.latitude, longitude: startPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.flagMarker, { backgroundColor: INSIDE_COLOR }]}>
            <MaterialCommunityIcons name="flag" size={14} color={nbColors.white} />
            <Text style={styles.flagText}>Mulai {formatTime(startPoint.logged_at)}</Text>
          </View>
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Titik Mulai</Text>
              <Text style={styles.calloutTime}>{formatTimeFull(startPoint.logged_at)}</Text>
              <Text style={styles.calloutDetail}>
                {startPoint.latitude.toFixed(5)}, {startPoint.longitude.toFixed(5)}
              </Text>
              {startPoint.accuracy != null && (
                <Text style={styles.calloutDetail}>±{startPoint.accuracy.toFixed(0)} m</Text>
              )}
              {startPoint.battery_level != null && (
                <Text style={styles.calloutDetail}>Baterai: {startPoint.battery_level}%</Text>
              )}
              <Text style={styles.calloutDetail}>
                {startPoint.is_within_area ? 'Di dalam area' : 'Di luar area'}
              </Text>
            </View>
          </Callout>
        </Marker>
      )}

      {/* End marker - red flag */}
      {mounted && !isLoading && endPoint && (
        <Marker
          coordinate={{ latitude: endPoint.latitude, longitude: endPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.flagMarker, { backgroundColor: nbColors.dangerDark }]}>
            <MaterialCommunityIcons name="flag-checkered" size={14} color={nbColors.white} />
            <Text style={styles.flagText}>Akhir {formatTime(endPoint.logged_at)}</Text>
          </View>
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Titik Akhir</Text>
              <Text style={styles.calloutTime}>{formatTimeFull(endPoint.logged_at)}</Text>
              <Text style={styles.calloutDetail}>
                {endPoint.latitude.toFixed(5)}, {endPoint.longitude.toFixed(5)}
              </Text>
              {endPoint.accuracy != null && (
                <Text style={styles.calloutDetail}>±{endPoint.accuracy.toFixed(0)} m</Text>
              )}
              {endPoint.battery_level != null && (
                <Text style={styles.calloutDetail}>Baterai: {endPoint.battery_level}%</Text>
              )}
              <Text style={styles.calloutDetail}>
                {endPoint.is_within_area ? 'Di dalam area' : 'Di luar area'}
              </Text>
            </View>
          </Callout>
        </Marker>
      )}

      {/* Intermediate numbered circle markers — sampled to max 50 for performance */}
      {mounted && !isLoading && sampleIntermediatePoints(intermediatePoints).map(({ point: pt, originalIndex }) => {
        // Display number counts from 1 (start is 0, first intermediate is 1)
        const displayNum = originalIndex + 1;
        return (
          <Marker
            key={`pt-${originalIndex}`}
            coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
            tracksViewChanges={false}
          >
            <View style={styles.numberedMarker}>
              <Text style={styles.numberedMarkerText}>{displayNum}</Text>
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Titik #{displayNum}</Text>
                <Text style={styles.calloutTime}>{formatTimeFull(pt.logged_at)}</Text>
                <Text style={styles.calloutDetail}>
                  {pt.latitude.toFixed(5)}, {pt.longitude.toFixed(5)}
                </Text>
                {pt.accuracy != null && (
                  <Text style={styles.calloutDetail}>±{pt.accuracy.toFixed(0)} m</Text>
                )}
                {pt.battery_level != null && (
                  <Text style={styles.calloutDetail}>Baterai: {pt.battery_level}%</Text>
                )}
                <Text style={styles.calloutDetail}>
                  {pt.is_within_area ? 'Di dalam area' : 'Di luar area'}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      })}

      {/* Control bar overlay */}
      <TrailControlBar
        date={currentDate}
        onDateChange={handleDateChange}
        shiftId={currentShiftId}
        onShiftChange={setCurrentShiftId}
        hideOthers={hideOthers}
        onHideOthersToggle={handleHideOthersToggle}
        onClose={handleClose}
      />

      {/* Info bar overlay */}
      {!isLoading && !error && history && (
        <TrailInfoBar history={history} date={currentDate} />
      )}

      {/* Loading/error state overlays */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Memuat riwayat lokasi...</Text>
        </View>
      )}
      {error && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flagMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.white,
    gap: 3,
    ...nbShadows.sm,
  },
  flagText: {
    color: nbColors.white,
    fontSize: 9,
    fontWeight: nbTypography.fontWeight.bold,
  },
  dotMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nbColors.white,
  },
  numberedMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: nbColors.white,
    borderWidth: 2,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberedMarkerText: {
    fontSize: 8,
    fontWeight: nbTypography.fontWeight.bold,
    color: '#4338CA', // indigo-700
    lineHeight: 10,
    textAlign: 'center',
  },
  callout: {
    backgroundColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    padding: nbSpacing.xs,
    minWidth: 120,
  },
  calloutTitle: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    marginBottom: 2,
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
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbBorderRadius.base,
  },
  errorText: {
    color: nbColors.dangerDark,
    fontSize: nbTypography.fontSize.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbBorderRadius.base,
  },
});
