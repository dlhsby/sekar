/**
 * usePruningGpsCapture — GPS location capture with permission handling.
 * Auto-captures on mount, provides refresh button callback.
 */

import { useCallback, useEffect, useState } from 'react';
import { readPosition } from '../../../services/location/verifiedPosition';
import { describeLocationError } from '../../../services/location/locationErrors';
import i18n from '../../../i18n/config';
import {
  requestLocationPermission,
} from '../../../services/permissions/permissionService';

export function usePruningGpsCapture() {
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const captureLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const perm = await requestLocationPermission();
      if (perm.status !== 'granted') {
        setGpsError(
          i18n.t('location:errors.capturePermissionDenied'),
        );
        setGpsLoading(false);
        return;
      }
      // A pruning request pins a real tree to a real coordinate, so a mocked fix
      // is refused. maximumAge falls back to the reader's default of 0 — a
      // cached fix can predate a mock provider being switched off.
      await readPosition({ geoOptions: { timeout: 15000 } })
        .then((pos) => {
          setGpsLat(pos.latitude);
          setGpsLng(pos.longitude);
          setGpsAccuracy(pos.accuracy ?? 0);
          setGpsLoading(false);
        })
        .catch((err) => {
          setGpsError(describeLocationError(err));
          setGpsLoading(false);
        });
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : i18n.t('location:errors.captureFailed'));
      setGpsLoading(false);
    }
  }, []);

  // Auto-capture on mount.
  useEffect(() => {
    void captureLocation();
  }, [captureLocation]);

  return {
    gpsLat,
    setGpsLat,
    gpsLng,
    setGpsLng,
    gpsAccuracy,
    setGpsAccuracy,
    gpsLoading,
    gpsError,
    setGpsError,
    captureLocation,
  };
}
