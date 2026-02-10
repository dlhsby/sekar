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
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import config from '../../constants/config';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { clockIn, clockOut, getCurrentShift } from '../../services/api/shiftsApi';
import { setCurrentShift } from '../../store/slices/shiftSlice';
import { calculateDistance, isWithinBoundary as checkWithinBoundary } from '../../utils/gpsUtils';
import { requestClockInPermissions } from '../../services/permissions';
import { locationTracker } from '../../services/location/locationTracker';
import { formatTime } from '../../utils/dateUtils';

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
 * Uses Neo Brutalism design system
 */
export function ClockInOutScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { assignedArea, user } = useAppSelector((state) => state.auth);
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
  const [timer, setTimer] = useState('00:00:00');

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
    let isMounted = true; // Track if component is mounted

    const initializeLocation = async () => {
      const result = await requestClockInPermissions();
      if (!isMounted) {return;} // Prevent state update if unmounted

      if (!result.success) {
        setLocation((prev) => ({ ...prev, error: result.message || 'Permission denied' }));
        return;
      }

      // Get initial location
      getCurrentLocation();

      // Watch position for continuous updates during clock-in/out
      watchId = Geolocation.watchPosition(
        (position) => {
          if (!isMounted) {return;} // Prevent state update if unmounted

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
          if (!isMounted) {return;} // Prevent state update if unmounted
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

    // Cleanup: Clear watch on unmount and mark as unmounted
    return () => {
      isMounted = false;
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
        watchId = null;
      }
    };
  }, [assignedArea]);

  // Update timer every second when clocked in
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setTimer(
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      );
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentShift?.id]);

  const pad = (num: number): string => String(num).padStart(2, '0');

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
        `Anda tidak berada dalam radius ${assignedArea?.radius_meters ?? 100}m dari ${assignedArea?.name ?? 'area'}. Mohon mendekat ke dalam area untuk clock in.`,
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
      // Convert file URI to Base64 for API upload
      // Remove file:// prefix if present for RNFS compatibility
      const filePath = selfieUri.replace('file://', '');
      const base64Data = await RNFS.readFile(filePath, 'base64');
      const selfieBase64 = `data:image/jpeg;base64,${base64Data}`;

      const response = await clockIn(
        assignedArea.id,  // UUID string
        location.latitude,
        location.longitude,
        selfieBase64,
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

      Alert.alert('Berhasil', 'Berhasil clock in!', [
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
      'Konfirmasi Clock Out',
      'Apakah Anda yakin ingin mengakhiri shift?',
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

              Alert.alert('Berhasil', 'Berhasil clock out!', [
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
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Anda belum ditugaskan ke area manapun</Text>
            <Text style={styles.subtitle}>Hubungi supervisor untuk penugasan area</Text>
            <NBButton
              title="Kembali"
              onPress={() => navigation.goBack()}
              variant="primary"
              fullWidth
            />
          </View>
        </View>
      </NBBackgroundPattern>
    );
  }

  // Loading state
  if (location.loading && !location.latitude) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={nbColors.primary} />
            <Text style={styles.loadingText}>Mendapatkan lokasi Anda...</Text>
          </View>
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Offline Banner for Clock-in (at the very top) */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerIcon}>📵</Text>
            <Text style={styles.offlineBannerText}>
              Mode Offline - Clock in memerlukan koneksi
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          {isClockIn ? (
            <>
              <Text style={styles.title}>Clock In</Text>
              <Text style={styles.headerSubtitle}>
                Ambil foto diri dan konfirmasi lokasi untuk memulai shift
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Clock Out</Text>
              <Text style={styles.headerSubtitle}>
                Konfirmasi lokasi untuk mengakhiri shift
              </Text>
            </>
          )}
        </View>

        {/* Area Info Card */}
        {assignedArea && (
          <NBCard variant="elevated" style={styles.card}>
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
          </NBCard>
        )}

        {/* Current Location Card */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Lokasi Anda</Text>

          {location.error ? (
            <View>
              <Text style={styles.errorText}>{location.error}</Text>
              <NBButton
                title="Coba Lagi"
                onPress={getCurrentLocation}
                variant="secondary"
                fullWidth
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
              {/* GPS Accuracy Warning */}
              {location.accuracy !== null && location.accuracy > config.GPS_ACCURACY_THRESHOLD && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningText}>
                    GPS kurang akurat. Pindah ke area terbuka untuk hasil lebih baik.
                  </Text>
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
              <View
                style={styles.boundaryStatus}
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
              >
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
                    ? isClockIn
                      ? 'Dalam batas - Anda dapat clock in'
                      : 'Dalam batas - Anda dapat clock out'
                    : 'Di luar batas - Mohon mendekat ke dalam area'}
                </Text>
              </View>
              <NBButton
                title="Perbarui Lokasi"
                onPress={getCurrentLocation}
                variant="info"
                fullWidth
                disabled={location.loading}
              />

              {/* Clock-in info when clocked in - Below Perbarui Lokasi button */}
              {!isClockIn && currentShift && (
                <View style={styles.clockInInfo}>
                  <View style={styles.timerContainer}>
                    <Text style={styles.timerLabel}>Waktu Shift:</Text>
                    <Text style={styles.timerValue}>{timer}</Text>
                  </View>
                  <View style={styles.clockInTimeRow}>
                    <Text style={styles.clockInLabel}>Clock In:</Text>
                    <Text style={styles.clockInTime}>
                      {formatTime(currentShift.clock_in_time)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <ActivityIndicator size="small" color={nbColors.primary} />
          )}
        </NBCard>

        {/* Selfie Card (Clock In only) */}
        {isClockIn && (
          <NBCard variant="elevated" style={styles.card}>
            <Text style={styles.cardTitle}>Foto Selfie</Text>
            {selfieUri ? (
              <View>
                <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                <NBButton
                  title="Ambil Ulang"
                  onPress={handleCaptureSelfie}
                  variant="secondary"
                  fullWidth
                />
              </View>
            ) : (
              <View>
                <Text style={styles.selfiePrompt}>Ambil selfie untuk verifikasi identitas</Text>
                <NBButton
                  title="Ambil Selfie"
                  onPress={handleCaptureSelfie}
                  variant="primary"
                  fullWidth
                />
              </View>
            )}
          </NBCard>
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
        <View style={styles.submitButtonContainer}>
          <NBButton
            title={isClockIn ? 'Clock In' : 'Clock Out'}
            onPress={isClockIn ? handleClockIn : handleClockOut}
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              location.loading ||
              !location.latitude ||
              !location.longitude ||
              (isClockIn && (!isWithinBoundary || !selfieUri || !isOnline))
            }
            accessibilityHint={
              isClockIn
                ? 'Mulai shift kerja dengan verifikasi foto diri dan lokasi'
                : 'Akhiri shift kerja saat ini'
            }
          />
        </View>

        {/* Offline Warning for Clock-out */}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Mode offline. Clock out akan disinkronkan saat online.
            </Text>
          </View>
        )}
      </ScrollView>
        </View>
      </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: nbSpacing.xl,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: nbSpacing.md, // 16px vertical padding
    paddingBottom: nbSpacing.xl, // Extra bottom padding for scroll comfort
  },
  header: {
    marginHorizontal: nbSpacing.md, // 16px - consistent edge spacing
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: 2, // 2px - reduced from 4px
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
  },
  headerSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    lineHeight: 18, // Reduced from 20
  },
  card: {
    marginHorizontal: nbSpacing.md, // 16px - consistent edge spacing
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
    padding: 10, // 10px - reduced from 12px
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base, // 16px
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs, // 4px - reduced from 8px
  },
  areaName: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: 2, // 2px - reduced from 4px
  },
  areaAddress: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6, // 6px - reduced from 8px
  },
  infoLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[700],
    fontWeight: nbTypography.fontWeight.medium,
  },
  infoValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  // Neo Brutalism boundary status: sharp corners
  boundaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm, // 8px - reduced from 16px
    marginBottom: nbSpacing.xs, // 4px - reduced from 8px
    padding: nbSpacing.sm,
    borderRadius: 0, // Sharp corners - NB style
    backgroundColor: nbColors.gray[50],
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 0, // Sharp square - NB style
    marginRight: nbSpacing.sm,
    borderWidth: 2,
    borderColor: nbColors.black,
  },
  statusDotSuccess: {
    backgroundColor: nbColors.success,
  },
  statusDotError: {
    backgroundColor: nbColors.danger,
  },
  statusText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    flex: 1,
  },
  statusTextSuccess: {
    color: nbColors.success,
  },
  statusTextError: {
    color: nbColors.danger,
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.danger,
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
  },
  // Neo Brutalism selfie image: sharp corners, thick border
  selfieImage: {
    width: '100%',
    height: 250, // 250px - reduced from 300px for more content
    borderRadius: 0, // Sharp corners - NB style
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
    backgroundColor: nbColors.gray[200],
  },
  selfiePrompt: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    textAlign: 'center',
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
  },
  submitButtonContainer: {
    marginHorizontal: nbSpacing.md, // 16px - consistent edge spacing
    marginTop: nbSpacing.xs, // 4px - reduced from 8px
  },
  // Neo Brutalism warning box: sharp corners, thick border
  offlineWarning: {
    marginHorizontal: nbSpacing.md, // 16px - consistent edge spacing
    marginTop: nbSpacing.sm, // 8px - reduced from 16px
    padding: nbSpacing.sm, // 8px - reduced from 16px
    backgroundColor: nbColors.white,
    borderRadius: 0, // Sharp corners - NB style
    borderWidth: nbBorders.default,
    borderColor: nbColors.warning,
    ...nbShadows.sm,
  },
  offlineWarningText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.warning,
    textAlign: 'center',
  },
  // Neo Brutalism offline banner: sharp corners, solid background
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.danger,
    padding: nbSpacing.sm, // 8px - reduced from 16px
    marginBottom: nbSpacing.sm, // 8px - reduced from 16px
    borderRadius: 0, // Sharp corners - NB style
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  offlineBannerIcon: {
    fontSize: 20,
    marginRight: nbSpacing.sm,
  },
  offlineBannerText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.white,
    fontWeight: nbTypography.fontWeight.bold,
    flex: 1,
  },
  // Neo Brutalism warning box: sharp corners, thick border
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm, // 8px - reduced from 16px
    padding: nbSpacing.sm, // 8px - reduced from 16px
    backgroundColor: nbColors.white,
    borderRadius: 0, // Sharp corners - NB style
    borderWidth: nbBorders.default,
    borderColor: nbColors.warning,
    ...nbShadows.sm,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: nbSpacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[700],
    fontWeight: nbTypography.fontWeight.medium,
  },
  // Clock-in info display (compact) - Below Perbarui Lokasi button
  clockInInfo: {
    marginTop: nbSpacing.sm, // 8px - reduced from 16px
    padding: 6, // 6px - reduced from 8px for compactness
    backgroundColor: nbColors.gray[50],
    borderRadius: 0, // Sharp corners - NB style
    borderWidth: nbBorders.thin, // 1px border
    borderColor: nbColors.black,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 2, // 2px - reduced from 4px
  },
  timerLabel: {
    fontSize: nbTypography.fontSize.xs, // 12px
    fontWeight: nbTypography.fontWeight.medium, // 500
    color: nbColors.gray[600],
    marginBottom: 1, // 1px - reduced from 2px
  },
  timerValue: {
    fontSize: nbTypography.fontSize.xl, // 20px - prominent timer
    fontWeight: nbTypography.fontWeight.extrabold, // 800
    color: nbColors.accentGrass, // Bright green for active timer
    letterSpacing: 1,
  },
  clockInTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2, // 2px - reduced from 4px
    borderTopWidth: 1, // 1px separator line
    borderTopColor: nbColors.gray[300],
  },
  clockInLabel: {
    fontSize: nbTypography.fontSize.xs, // 12px
    fontWeight: nbTypography.fontWeight.medium, // 500
    color: nbColors.gray[600],
  },
  clockInTime: {
    fontSize: nbTypography.fontSize.sm, // 14px
    fontWeight: nbTypography.fontWeight.semibold, // 600
    color: nbColors.black,
  },
});

export default ClockInOutScreen;
