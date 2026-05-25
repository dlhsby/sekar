/**
 * LocationTrail
 *
 * Split into three exports because react-native-maps' MapView crashes on Fabric
 * (Android, New Arch) when given non-feature children — TrailControlBar /
 * TrailInfoBar / loading-and-error <View>s fall through MapView.addFeature() to
 * a generic ViewGroup.addView and trip "specified child already has a parent".
 *
 *   - useLocationHistory(userId, date, shiftId): owns the API fetch + refresh
 *   - LocationTrailMapLayers: ONLY Polyline + Marker; render inside <MapView>
 *   - LocationTrailOverlay:   ONLY <View>/<Text> overlays; render outside <MapView>
 *
 * Canonical colors (Neo Brutalism 2.0): inside-area uses nbColors.successDark,
 * outside-area uses nbColors.dangerDark — both are tokens, not literals.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker, Polyline, Callout } from 'react-native-maps';
import type MapView from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbShadows,
  nbSpacing,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { getUserLocationHistory } from '../../services/api/monitoringApi';
import { TrailControlBar } from './TrailControlBar';
import { TrailInfoBar } from './TrailInfoBar';
import type { LocationHistoryPoint, LocationHistory } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

// Color tokens live in trailColors.ts so non-map consumers (TrailInfoBar,
// tests) don't pull in react-native-maps via this module.
export { TRAIL_INSIDE_COLOR, TRAIL_OUTSIDE_COLOR, TRAIL_LINE_COLOR } from './trailColors';
import {
  TRAIL_INSIDE_COLOR,
  TRAIL_OUTSIDE_COLOR,
  TRAIL_LINE_COLOR,
} from './trailColors';

/** Cap for intermediate Markers — downsampled past this. Preserves Fabric perf. */
const MAX_INTERMEDIATE_MARKERS = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Inside / outside accent for individual point markers. */
function pointColor(pt: LocationHistoryPoint): string {
  return pt.is_within_area ? TRAIL_INSIDE_COLOR : TRAIL_OUTSIDE_COLOR;
}

/**
 * Build the polyline coordinates. The line itself is rendered in a single
 * uniform blue color (`TRAIL_LINE_COLOR`) — inside/outside distinction is
 * conveyed by the dot markers along the line, not by segment color.
 */
function buildTrailCoordinates(
  points: LocationHistoryPoint[],
): { latitude: number; longitude: number }[] {
  return points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
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

/** Return every Nth intermediate point so we never exceed MAX_INTERMEDIATE_MARKERS. */
function sampleIntermediatePoints(
  points: LocationHistoryPoint[],
): { point: LocationHistoryPoint; originalIndex: number }[] {
  if (points.length === 0) { return []; }
  const step = Math.ceil(points.length / MAX_INTERMEDIATE_MARKERS);
  return points
    .map((point, originalIndex) => ({ point, originalIndex }))
    .filter((_, i) => i % step === 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLocationHistoryResult {
  history: LocationHistory | null;
  isLoading: boolean;
  error: string | null;
  /** Refetches the same userId/date/shiftId. Useful for manual refresh FABs. */
  refresh: () => void;
}

export function useLocationHistory(
  userId: string | undefined,
  date: string,
  shiftId?: string,
): UseLocationHistoryResult {
  const [history, setHistory] = useState<LocationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by refresh() — keys the fetch effect so we re-run with the same args.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setHistory(null);
      setIsLoading(false);
      setError(null);
      return;
    }
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
        }
      })
      .catch(() => {
        if (!cancelled) { setError('Gagal memuat riwayat lokasi'); }
      })
      .finally(() => {
        if (!cancelled) { setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [userId, date, shiftId, refreshTick]);

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1);
  }, []);

  return { history, isLoading, error, refresh };
}

// ─── TrailPointCallout (reusable) ─────────────────────────────────────────────

interface TrailPointCalloutProps {
  title: string;
  point: LocationHistoryPoint;
}

/**
 * Shared Callout content for every trail Marker (start / end / intermediate).
 * Eliminates the ~30 lines of duplicated JSX previously inlined in each Marker.
 */
function TrailPointCallout({ title, point }: TrailPointCalloutProps): React.JSX.Element {
  return (
    <Callout tooltip>
      <View style={styles.callout}>
        <NBText variant="caption" color="white" style={{ marginBottom: 2 }}>
          {title}
        </NBText>
        <NBText variant="caption" color="white">
          {formatTimeFull(point.logged_at)}
        </NBText>
        <NBText variant="caption" color="gray400">
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
        </NBText>
        {point.accuracy != null && (
          <NBText variant="caption" color="gray400">
            ±{Number(point.accuracy).toFixed(0)} m
          </NBText>
        )}
        {point.battery_level != null && (
          <NBText variant="caption" color="gray400">
            Baterai: {point.battery_level}%
          </NBText>
        )}
        <NBText variant="caption" color="gray400">
          {point.is_within_area ? 'Di dalam area' : 'Di luar area'}
        </NBText>
      </View>
    </Callout>
  );
}

// ─── MapView children only (Polyline + Marker) ────────────────────────────────

interface LocationTrailMapLayersProps {
  history: LocationHistory | null;
  isLoading: boolean;
  mapRef?: React.RefObject<MapView | null>;
}

export function LocationTrailMapLayers({
  history,
  isLoading,
  mapRef,
}: LocationTrailMapLayersProps): React.JSX.Element | null {
  // Stage-1: defer first attach by one animation frame so MapView is fully
  // settled before we add Polyline/Marker children.
  const [mounted, setMounted] = useState(false);
  // Stage-2: hold off intermediate Markers until segments + flags have settled,
  // to avoid attaching ~50 children in a single Choreographer frame.
  const [intermediatesMounted, setIntermediatesMounted] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => { setMounted(true); });
    return () => { cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    if (!mounted || isLoading || !history) {
      setIntermediatesMounted(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => { setIntermediatesMounted(true); });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) { cancelAnimationFrame(raf2); }
    };
  }, [mounted, isLoading, history]);

  // Auto-fit map bounds whenever history loads
  useEffect(() => {
    if (history && mapRef && history.points.length > 0) {
      fitTrailBounds(mapRef, history.points);
    }
  }, [history, mapRef]);

  const trailCoordinates = useMemo(
    () => (history ? buildTrailCoordinates(history.points) : []),
    [history],
  );

  const startPoint = history?.points[0] ?? null;
  const endPoint = history && history.points.length > 1
    ? history.points[history.points.length - 1]
    : null;
  const intermediatePoints = useMemo(
    () => history?.points.slice(1, -1) ?? [],
    [history],
  );
  const sampledIntermediates = useMemo(
    () => sampleIntermediatePoints(intermediatePoints),
    [intermediatePoints],
  );

  if (isLoading || !history) { return null; }

  return (
    <>
      {mounted && trailCoordinates.length >= 2 && (
        <Polyline
          coordinates={trailCoordinates}
          strokeColor={TRAIL_LINE_COLOR}
          strokeWidth={4}
        />
      )}

      {mounted && startPoint && (
        <Marker
          coordinate={{ latitude: startPoint.latitude, longitude: startPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.flagMarker, styles.flagMarkerLight]}>
            <MaterialCommunityIcons name="flag" size={14} color={nbColors.black} />
            <NBText variant="caption" color="black" style={{ fontSize: 9 }}>
              Mulai {formatTime(startPoint.logged_at)}
            </NBText>
          </View>
          <TrailPointCallout title="Titik Mulai" point={startPoint} />
        </Marker>
      )}

      {mounted && endPoint && (
        <Marker
          coordinate={{ latitude: endPoint.latitude, longitude: endPoint.longitude }}
          tracksViewChanges={false}
        >
          <View style={[styles.flagMarker, styles.flagMarkerDark]}>
            <MaterialCommunityIcons name="flag-checkered" size={14} color={nbColors.white} />
            <NBText variant="caption" color="white" style={{ fontSize: 9 }}>
              Akhir {formatTime(endPoint.logged_at)}
            </NBText>
          </View>
          <TrailPointCallout title="Titik Akhir" point={endPoint} />
        </Marker>
      )}

      {intermediatesMounted && sampledIntermediates.map(({ point: pt, originalIndex }) => {
        const displayNum = originalIndex + 1;
        const accent = pointColor(pt);
        return (
          <Marker
            key={`pt-${originalIndex}`}
            coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
            tracksViewChanges={false}
          >
            <View style={[styles.numberedMarker, { borderColor: accent }]}>
              <NBText variant="caption" style={{ color: accent, fontSize: 9, lineHeight: 11 }}>
                {displayNum}
              </NBText>
            </View>
            <TrailPointCallout title={`Titik #${displayNum}`} point={pt} />
          </Marker>
        );
      })}
    </>
  );
}

// ─── Overlay views only (TrailControlBar + TrailInfoBar + loading/error) ──────

interface LocationTrailOverlayProps {
  history: LocationHistory | null;
  isLoading: boolean;
  error: string | null;
  date: string;
  onDateChange: (date: string) => void;
  userName?: string;
  onClose: () => void;
}

export function LocationTrailOverlay({
  history,
  isLoading,
  error,
  date,
  onDateChange,
  userName,
  onClose,
}: LocationTrailOverlayProps): React.JSX.Element {
  return (
    <>
      <TrailControlBar
        userName={userName}
        date={date}
        onDateChange={onDateChange}
        onClose={onClose}
      />

      {!isLoading && !error && history && (
        <TrailInfoBar history={history} date={date} />
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <NBText variant="body-sm" color="white" style={styles.loadingText}>
            Memuat riwayat lokasi...
          </NBText>
        </View>
      )}
      {error && (
        <View style={styles.loadingOverlay}>
          <NBText variant="body-sm" color="dangerDark" style={styles.errorText}>
            {error}
          </NBText>
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
    borderColor: nbColors.black,
    gap: 3,
    ...nbShadows.sm,
  },
  flagMarkerLight: {
    backgroundColor: nbColors.white,
  },
  flagMarkerDark: {
    backgroundColor: nbColors.black,
    borderColor: nbColors.black,
  },

  numberedMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: nbColors.white,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  callout: {
    backgroundColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    padding: nbSpacing.xs,
    minWidth: 120,
  },

  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbBorderRadius.base,
  },
  errorText: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbBorderRadius.base,
  },
});
