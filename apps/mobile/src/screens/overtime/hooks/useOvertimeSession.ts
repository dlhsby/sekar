/**
 * useOvertimeSession
 * Manages loading active overtime, elapsed time, and location/GPS state.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { readPosition } from '../../../services/location/verifiedPosition';
import { getActiveOvertime } from '../../../services/api/overtimeApi';
import { isWithinAreaBoundary } from '../../../utils/gpsUtils';
import type { Overtime } from '../../../types/models.types';
import type { Coordinates } from '../../../types/geo.types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatElapsed(startIso: string): string {
  const elapsed = Date.now() - new Date(startIso).getTime();
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1_000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function useOvertimeSession(assignedArea: any) {
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [activeOvertime, setActiveOvertime] = useState<Overtime | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');

  const isWithinBoundary = location && assignedArea
    ? isWithinAreaBoundary(location.latitude, location.longitude, assignedArea)
    : undefined;

  const captureLocation = useCallback(() => {
    setIsCapturingLocation(true);
    // Overtime is attendance, so a mocked fix is refused rather than recorded.
    // The 10s maximumAge is dropped in favour of the reader's default of 0 —
    // a cached fix can predate a mock provider being switched off.
    readPosition({ geoOptions: { timeout: 15_000 } })
      .then((position) => {
        setLocation({
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy ?? 0,
        });
        setIsCapturingLocation(false);
      })
      .catch(() => {
        // Leave `location` null: the screen already treats "no location" as
        // not-ready, so a refused mock fix cannot be submitted as a real one.
        setIsCapturingLocation(false);
      });
  }, []);

  const fetchActiveOvertime = useCallback(async () => {
    setIsLoadingActive(true);
    try {
      const response = await getActiveOvertime();
      setActiveOvertime(response.data ?? null);
    } catch {
      setActiveOvertime(null);
    } finally {
      setIsLoadingActive(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActiveOvertime();
      captureLocation();
    }, [fetchActiveOvertime, captureLocation]),
  );

  // Elapsed time ticker (State B)
  useEffect(() => {
    if (!activeOvertime?.start_datetime) { return; }
    const tick = () => setElapsed(formatElapsed(activeOvertime.start_datetime));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [activeOvertime?.start_datetime, activeOvertime?.id]);

  return {
    isLoadingActive,
    activeOvertime,
    setActiveOvertime,
    location,
    setLocation,
    isCapturingLocation,
    captureLocation,
    elapsed,
    isWithinBoundary,
  };
}
