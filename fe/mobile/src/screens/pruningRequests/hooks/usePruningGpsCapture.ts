/**
 * usePruningGpsCapture — GPS location capture with permission handling.
 * Auto-captures on mount, provides refresh button callback.
 */

import { useCallback, useEffect, useState } from 'react';
import Geolocation from 'react-native-geolocation-service';
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
          'Izin lokasi ditolak. Aktifkan izin lokasi di Pengaturan untuk menangkap koordinat GPS otomatis.',
        );
        setGpsLoading(false);
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
          setGpsAccuracy(pos.coords.accuracy);
          setGpsLoading(false);
        },
        (err) => {
          setGpsError(`Gagal mendapatkan lokasi: ${err.message}`);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Gagal menangkap lokasi GPS');
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
