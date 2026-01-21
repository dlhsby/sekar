import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Button, Card } from '../../components/common';
import { theme } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { clockIn, clockOut, getCurrentShift } from '../../services/api/shiftsApi';
import { setCurrentShift } from '../../store/slices/shiftSlice';
import { calculateDistance, isWithinBoundary as checkWithinBoundary } from '../../utils/gpsUtils';
import { requestClockInPermissions } from '../../services/permissions';
import { locationTracker } from '../../services/location/locationTracker';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Clock In/Out Screen
 * Handles worker clock-in with GPS validation and selfie, and clock-out
 */
export function ClockInOutScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const { isOnline } = useAppSelector((state) => state.offline);

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithinBoundary, setIsWithinBoundary] = useState(false);

  const isClockIn = !currentShift; // If no current shift, it's clock-in mode

  const handleLocationSuccess = useCallback((position: any) => {
    const { latitude, longitude, accuracy } = position.coords;

    setLocation({
      latitude,
      longitude,
      accuracy: accuracy || null,
      loading: false,
      error: null,
    });

    // Check if within boundary
    if (assignedArea && assignedArea.gps_lat != null && assignedArea.gps_lng != null) {
      // Ensure GPS coordinates are numbers (PostgreSQL DECIMAL may return as strings)
      const areaLat = Number(assignedArea.gps_lat);
      const areaLng = Number(assignedArea.gps_lng);
      const radiusMeters = Number(assignedArea.radius_meters);

      console.log('Boundary check:', {
        currentLocation: { lat: latitude, lng: longitude },
        areaCenter: { lat: areaLat, lng: areaLng },
        radius: radiusMeters,
      });

      const within = checkWithinBoundary(
        latitude,
        longitude,
        areaLat,
        areaLng,
        radiusMeters,
      );
      setIsWithinBoundary(within);

      const distance = calculateDistance(
        latitude,
        longitude,
        areaLat,
        areaLng,
      );
      console.log(`Distance from area center: ${distance.toFixed(2)}m, within boundary: ${within}`);
    }
  }, [assignedArea]);

  const getCurrentLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    // Use react-native-geolocation-service with Android-specific options
    Geolocation.getCurrentPosition(
      handleLocationSuccess,
      (error) => {
        console.error('Location error:', error);

        // Handle specific error codes
        let errorMessage = 'Tidak dapat mendapatkan lokasi.';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Izin lokasi ditolak. Aktifkan di pengaturan.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'GPS tidak tersedia. Pastikan GPS aktif.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Waktu habis. Coba di area terbuka.';
            break;
          case 4: // PLAY_SERVICE_NOT_AVAILABLE
            errorMessage = 'Google Play Services tidak tersedia.';
            break;
          case 5: // SETTINGS_NOT_SATISFIED
            errorMessage = 'Pengaturan lokasi tidak memenuhi. Aktifkan GPS.';
            break;
        }

        setLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          loading: false,
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds - reduced for faster feedback
        maximumAge: 5000, // Accept cached location up to 5 seconds old
        forceRequestLocation: true, // Force request even if recent location exists
        forceLocationManager: false, // Use FusedLocationProvider (more accurate)
        showLocationDialog: true, // Show dialog if location settings not satisfied
      },
    );
  }, [handleLocationSuccess]);

  // Request permissions on mount and get initial location
  useEffect(() => {
    let watchId: number | null = null;

    const initializeLocation = async () => {
      const result = await requestClockInPermissions();
      if (!result.success) {
        setLocation((prev) => ({ ...prev, error: result.message || 'Permission denied' }));
        return;
      }

      // Get initial location
      getCurrentLocation();

      // Watch position for continuous updates during clock-in/out
      watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({
            latitude,
            longitude,
            accuracy: accuracy || null,
            loading: false,
            error: null,
          });

          // Check if within boundary
          if (assignedArea && assignedArea.gps_lat != null && assignedArea.gps_lng != null) {
            const areaLat = Number(assignedArea.gps_lat);
            const areaLng = Number(assignedArea.gps_lng);
            const radiusMeters = Number(assignedArea.radius_meters);

            const within = checkWithinBoundary(
              latitude,
              longitude,
              areaLat,
              areaLng,
              radiusMeters,
            );
            setIsWithinBoundary(within);
          }
        },
        (error) => {
          console.error('Watch position error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // Update every 10 meters
          interval: 5000, // Update every 5 seconds
          fastestInterval: 2000, // Fastest update interval
          forceRequestLocation: true,
          forceLocationManager: false,
          showLocationDialog: true,
        },
      );
    };

    if (assignedArea) {
      initializeLocation();
    }

    // Cleanup: Clear watch on unmount
    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [assignedArea, getCurrentLocation]);

  const handleCaptureSelfie = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: false,
        saveToPhotos: false,
        presentationStyle: 'fullScreen',
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', 'Gagal mengambil foto. Silakan coba lagi.');
        return;
      }

      if (result.assets && result.assets[0]) {
        setSelfieUri(result.assets[0].uri || null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Gagal membuka kamera. Periksa izin akses.');
    }
  };

  const handleClockIn = async () => {
    // Validation
    if (!assignedArea) {
      Alert.alert('Error', 'Anda belum ditugaskan ke area manapun');
      return;
    }

    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', 'Lokasi belum tersedia. Tunggu GPS mendapatkan lokasi.');
      return;
    }

    if (!isWithinBoundary) {
      Alert.alert(
        'Di Luar Batas',
        `Anda tidak berada dalam radius ${assignedArea?.radius_meters ?? 100}m dari ${assignedArea?.name ?? 'area'}. Silakan mendekat untuk clock in.`,
      );
      return;
    }

    if (!selfieUri) {
      Alert.alert('Error', 'Silakan ambil selfie sebelum clock in');
      return;
    }

    // Submit clock-in
    setIsSubmitting(true);

    try {
      // Convert image to base64
      const base64Image = await RNFS.readFile(selfieUri, 'base64');
      const selfiePhotoBase64 = `data:image/jpeg;base64,${base64Image}`;

      // Call API with individual parameters (not FormData)
      const response = await clockIn(
        assignedArea.id,
        location.latitude,
        location.longitude,
        selfiePhotoBase64,
      );

      if (response.error || !response.data) {
        throw new Error(response.error || 'Gagal clock in');
      }

      // Fetch the full shift data after clocking in
      const shiftResponse = await getCurrentShift();
      if (shiftResponse.data) {
        dispatch(setCurrentShift(shiftResponse.data as any));

        // Start location tracking for this shift
        try {
          await locationTracker.initialize(shiftResponse.data.id);
        } catch (trackingError) {
          console.warn('Failed to start location tracking:', trackingError);
          // Don't fail clock-in if tracking fails to start
        }
      }

      // Clear selfie after successful clock-in
      setSelfieUri(null);

      Alert.alert('Berhasil', 'Clock in berhasil!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Clock-in error:', error);
      Alert.alert(
        'Gagal Clock In',
        error.response?.data?.message || error.message || 'Gagal clock in. Silakan coba lagi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentShift) {
      Alert.alert('Error', 'Tidak ada shift aktif');
      return;
    }

    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', 'Lokasi belum tersedia. Tunggu GPS mendapatkan lokasi.');
      return;
    }

    // Confirmation
    Alert.alert(
      'Clock Out',
      'Apakah Anda yakin ingin clock out?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);

            try {
              // Force upload any pending location data before clock-out
              try {
                await locationTracker.forceUpload();
                await locationTracker.stop();
              } catch (trackingError) {
                console.warn('Failed to stop location tracking:', trackingError);
                // Continue with clock-out even if tracking stop fails
              }

              const response = await clockOut(
                location.latitude!,
                location.longitude!,
              );

              // Check for error in response
              if (response.error) {
                Alert.alert('Gagal Clock Out', response.error);
                return;
              }

              dispatch(setCurrentShift(null));

              Alert.alert('Berhasil', 'Clock out berhasil!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              console.error('Clock-out error:', error);
              Alert.alert(
                'Gagal Clock Out',
                error.response?.data?.message ||
                  error.message ||
                  'Gagal clock out. Silakan coba lagi.',
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Check if user has assigned area
  if (!assignedArea) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Anda belum ditugaskan ke area manapun</Text>
          <Text style={styles.subtitle}>Hubungi supervisor untuk penugasan area</Text>
          <Button
            title="Kembali"
            onPress={() => navigation.goBack()}
            variant="primary"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (location.loading && !location.latitude) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Mendapatkan lokasi Anda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isClockIn ? 'Clock In' : 'Clock Out'}</Text>
          <Text style={styles.subtitle}>
            {isClockIn
              ? 'Ambil selfie dan konfirmasi lokasi untuk memulai shift'
              : 'Konfirmasi lokasi untuk mengakhiri shift'}
          </Text>
        </View>

        {/* Area Info Card */}
        {assignedArea && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Area Ditugaskan</Text>
            <Text style={styles.areaName}>{assignedArea.name}</Text>
            {assignedArea.address && (
              <Text style={styles.areaAddress}>{assignedArea.address}</Text>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipe Area:</Text>
              <Text style={styles.infoValue}>{assignedArea.area_type?.name || 'N/A'}</Text>
            </View>
            {assignedArea.gps_lat != null && assignedArea.gps_lng != null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Koordinat GPS:</Text>
                <Text style={styles.infoValue}>
                  {Number(assignedArea.gps_lat).toFixed(6)}, {Number(assignedArea.gps_lng).toFixed(6)}
                </Text>
              </View>
            )}
            {assignedArea.radius_meters != null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Radius Batas:</Text>
                <Text style={styles.infoValue}>{assignedArea.radius_meters}m</Text>
              </View>
            )}
          </Card>
        )}

        {/* Current Location Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Lokasi Anda</Text>

          {location.error ? (
            <View>
              <Text style={styles.errorText}>{location.error}</Text>
              <Button
                title="Coba Lagi"
                onPress={getCurrentLocation}
                variant="outline"
                style={styles.retryButton}
              />
            </View>
          ) : location.latitude && location.longitude ? (
            <View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GPS:</Text>
                <Text style={styles.infoValue}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
              {location.accuracy !== null && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Akurasi:</Text>
                  <Text style={styles.infoValue}>{location.accuracy.toFixed(0)}m</Text>
                </View>
              )}
              {assignedArea && assignedArea.gps_lat != null && assignedArea.gps_lng != null && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Jarak dari area:</Text>
                  <Text style={styles.infoValue}>
                    {calculateDistance(
                      location.latitude,
                      location.longitude,
                      Number(assignedArea.gps_lat),
                      Number(assignedArea.gps_lng),
                    ).toFixed(0)}
                    m
                  </Text>
                </View>
              )}
              <View style={styles.boundaryStatus}>
                <View
                  style={[
                    styles.statusDot,
                    isWithinBoundary ? styles.statusDotSuccess : styles.statusDotError,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    isWithinBoundary ? styles.statusTextSuccess : styles.statusTextError,
                  ]}>
                  {isWithinBoundary
                    ? 'Dalam batas - Anda dapat clock in'
                    : 'Di luar batas - Mendekat ke area'}
                </Text>
              </View>
              <Button
                title="Perbarui Lokasi"
                onPress={getCurrentLocation}
                variant="outline"
                style={styles.refreshButton}
                disabled={location.loading}
              />
            </View>
          ) : (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
        </Card>

        {/* Selfie Card (Clock In only) */}
        {isClockIn && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Foto Selfie</Text>
            {selfieUri ? (
              <View>
                <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                <Button
                  title="Ambil Ulang"
                  onPress={handleCaptureSelfie}
                  variant="outline"
                  style={styles.retakeButton}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.selfiePrompt}>Ambil selfie untuk verifikasi identitas</Text>
                <Button
                  title="Ambil Selfie"
                  onPress={handleCaptureSelfie}
                  variant="primary"
                  style={styles.captureButton}
                />
              </View>
            )}
          </Card>
        )}

        {/* Offline Warning for Clock-in */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Anda harus online untuk clock in. Sambungkan ke internet terlebih dahulu.
            </Text>
          </View>
        )}

        {/* Clock In/Out Button */}
        <Button
          title={isClockIn ? 'Clock In' : 'Clock Out'}
          onPress={isClockIn ? handleClockIn : handleClockOut}
          variant="primary"
          style={styles.submitButton}
          loading={isSubmitting}
          disabled={
            isSubmitting ||
            location.loading ||
            !location.latitude ||
            !location.longitude ||
            (isClockIn && (!isWithinBoundary || !selfieUri || !isOnline))
          }
        />

        {/* Offline Warning for Clock-out */}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Mode offline. Clock out akan disinkronkan saat online.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  areaName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  areaAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  boundaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  statusDotSuccess: {
    backgroundColor: theme.colors.success,
  },
  statusDotError: {
    backgroundColor: theme.colors.error,
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 1,
  },
  statusTextSuccess: {
    color: theme.colors.success,
  },
  statusTextError: {
    color: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    marginTop: theme.spacing.sm,
  },
  refreshButton: {
    marginTop: theme.spacing.sm,
  },
  selfieImage: {
    width: '100%',
    height: 300,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.gray200,
  },
  selfiePrompt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  captureButton: {
    marginTop: theme.spacing.sm,
  },
  retakeButton: {
    marginTop: theme.spacing.sm,
  },
  submitButton: {
    marginTop: theme.spacing.md,
  },
  offlineWarning: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  offlineWarningText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    textAlign: 'center',
  },
});

export default ClockInOutScreen;
