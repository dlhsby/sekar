/**
 * useOvertimeSession
 * Manages loading active overtime, elapsed time, and location/GPS state.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
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
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsCapturingLocation(false);
      },
      () => {
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
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
