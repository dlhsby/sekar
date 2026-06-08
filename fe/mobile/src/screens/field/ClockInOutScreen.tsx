import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GPSLocationSection, ImagePreviewModal } from '../../components/common';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBBackgroundPattern, NBText, NBAlert, NBBadge, NBCollapsibleCard } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import {
  nbColors,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbRadius,
  withAlpha,
} from '../../constants/nbTokens';
import { useClockInOut } from '../../hooks';
import { useAppSelector } from '../../store/hooks';
import { formatDateTime } from '../../utils/dateUtils';
import type { MainTabScreenProps } from '../../types/navigation.types';

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTimeHero(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateHero(d: Date): string {
  return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]}`;
}

/**
 * Clock In/Out Screen
 * Phase 2C: Soft geofencing (warnings only), auto-detect area from schedule
 * Uses Neo Brutalism design system
 */
export const ClockInOutScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MainTabScreenProps<'ClockInOut'>['navigation']>();
  const [selfiePreviewUri, setSelfiePreviewUri] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const {
    location,
    selfie,
    isSubmitting,
    isWithinBoundary,
    timer,
    isClockIn,
    isOnline,
    assignedArea,
    currentShift,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  } = useClockInOut();

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // Override navigator header: FieldHomeHeader owns all 3 columns (title + onBack).
  // try/catch suppresses the "outside a screen" error thrown by NavigationContainer in
  // test/Storybook contexts where setOptions exists but cannot be called. All other
  // errors (e.g. render crash inside FieldHomeHeader) are re-thrown.
  useEffect(() => {
    try {
      navigation.setOptions({
        headerTitle: () => (
          <FieldHomeHeader
            title={isClockIn ? 'Clock In' : 'Clock Out'}
            onBack={goBack}
          />
        ),
      });
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message.includes('outside a screen')) {
        throw e;
      }
    }
  }, [navigation, goBack, isClockIn]);

  // No assigned area — block only for area-scoped roles (satgas/linmas/korlap).
  // Rayon-scoped roles (admin_data/kepala_rayon) can clock in without a specific area.
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isRayonScoped = userRole === 'admin_data' || userRole === 'kepala_rayon';
  if (!assignedArea && !isRayonScoped) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <NBText variant="h2" color="black" style={styles.errorText}>Anda belum ditugaskan ke area manapun</NBText>
            <NBText variant="body" color="gray600">Hubungi supervisor untuk penugasan area</NBText>
            <NBButton title="Kembali" onPress={goBack} variant="primary" fullWidth />
          </View>
        </View>
      </NBBackgroundPattern>
    );
  }

  // Loading GPS
  if (location.loading && !location.latitude) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={nbColors.primary} />
            <NBText variant="body" color="gray600" style={styles.loadingText}>Mendapatkan lokasi Anda...</NBText>
          </View>
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {/* Scrollable content area — sits above the submit button */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Offline Banner (top of scroll) */}
          {!isOnline && isClockIn && (
            <View style={styles.offlineBanner}>
              <MaterialCommunityIcons
                name="wifi-off"
                size={20}
                color={nbColors.danger}
                style={{ marginRight: nbSpacing.sm }}
              />
              <NBText variant="body-sm" color="danger" style={styles.offlineBannerText}>Mode Offline - Clock in memerlukan koneksi</NBText>
            </View>
          )}

          {/* Time Hero */}
          <NBCollapsibleCard
            headerLeft={
              <NBText variant="h2" color="black" style={styles.timeHeroTime}>
                {formatTimeHero(currentTime)}
              </NBText>
            }
            headerRight={
              <NBText variant="mono-sm" color="gray600">{formatDateHero(currentTime)}</NBText>
            }
            accessibilityLabel="Detail waktu"
          >
            <NBText variant="body-sm" color="gray600" style={styles.centerText}>
              {isClockIn
                ? 'Ambil foto diri dan konfirmasi lokasi untuk memulai shift'
                : 'Konfirmasi lokasi untuk mengakhiri shift'}
            </NBText>
          </NBCollapsibleCard>

          {/* Area Info Card */}
          {assignedArea ? (
            <NBCollapsibleCard
              headerLeft={
                <View>
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>Area Ditugaskan</NBText>
                  <NBText variant="h3" color="black">{assignedArea.name}</NBText>
                </View>
              }
              accessibilityLabel="Detail area"
            >
              {assignedArea.address
                ? <NBText variant="body-sm" color="gray600" style={{ marginBottom: nbSpacing.sm }}>{assignedArea.address}</NBText>
                : null}
              <View style={styles.infoRow}>
                <NBText variant="body-sm" color="gray600">Tipe Area:</NBText>
                <NBText variant="body" color="black">{assignedArea.area_type?.name || 'N/A'}</NBText>
              </View>
              {assignedArea.gps_lat != null && assignedArea.gps_lng != null && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" color="gray600">Koordinat GPS:</NBText>
                  <NBText variant="body" color="black">
                    {Number(assignedArea.gps_lat).toFixed(6)}, {Number(assignedArea.gps_lng).toFixed(6)}
                  </NBText>
                </View>
              )}
              {assignedArea.radius_meters != null && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" color="gray600">Radius Batas:</NBText>
                  <NBText variant="body" color="black">{assignedArea.radius_meters}m</NBText>
                </View>
              )}
            </NBCollapsibleCard>
          ) : isRayonScoped ? (
            <View style={styles.staticCard}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>Cakupan Rayon</NBText>
              <NBText variant="h3" color="black">Clock in tanpa area spesifik</NBText>
            </View>
          ) : null}

          {/* Selfie Card (Clock In only) */}
          {isClockIn && (
            <NBCollapsibleCard
              headerLeft={
                <View>
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>Foto Selfie</NBText>
                  {selfie
                    ? <NBText variant="body-sm" color="success">Sudah diambil</NBText>
                    : <NBText variant="body-sm" color="gray600">Opsional</NBText>
                  }
                </View>
              }
              accessibilityLabel="Foto selfie"
            >
              {selfie ? (
                <View>
                  <TouchableOpacity
                    onPress={() => setSelfiePreviewUri(selfie.uri)}
                    accessibilityRole="button"
                    accessibilityLabel="Lihat selfie penuh"
                    accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
                  >
                    <Image source={{ uri: selfie.uri }} style={styles.selfieImage} />
                  </TouchableOpacity>
                  <NBButton title="Ambil Ulang" onPress={handleCaptureSelfie} variant="secondary" fullWidth />
                </View>
              ) : (
                <View>
                  <NBText variant="body-sm" color="gray600" style={styles.selfiePrompt}>Ambil selfie untuk verifikasi identitas</NBText>
                  <NBButton title="Ambil Selfie" onPress={handleCaptureSelfie} variant="secondary" fullWidth />
                </View>
              )}
            </NBCollapsibleCard>
          )}

          {/* GPS / Location Card */}
          <NBCollapsibleCard
            headerLeft={
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>Lokasi GPS</NBText>
            }
            headerRight={location.latitude != null
              ? <NBBadge
                  text={isWithinBoundary ? 'DI AREA' : 'LUAR AREA'}
                  color={isWithinBoundary ? 'success' : 'danger'}
                  size="sm"
                />
              : undefined
            }
            defaultExpanded
            accessibilityLabel="Lokasi GPS"
            style={styles.gpsCard}
          >
            <GPSLocationSection
              latitude={location.latitude}
              longitude={location.longitude}
              accuracy={location.accuracy}
              isCapturing={location.loading}
              onRefresh={getCurrentLocation}
              error={location.error}
              isWithinBoundary={isWithinBoundary}
              areaName={assignedArea?.name}
            />
            {!isClockIn && currentShift && (
              <View style={styles.clockInInfo}>
                <View style={styles.timerContainer}>
                  <NBText variant="body-sm" color="gray600">Waktu Shift:</NBText>
                  <NBText variant="display" color="statusIdle" style={styles.timerValue}>{timer}</NBText>
                </View>
                <View style={styles.clockInTimeRow}>
                  <NBText variant="caption" color="gray600">Clock In:</NBText>
                  <NBText variant="body-sm">{formatDateTime(currentShift.clock_in_time)}</NBText>
                </View>
              </View>
            )}
          </NBCollapsibleCard>
        </ScrollView>

        {/* Offline warnings — between scroll and submit button */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineWarning}>
            <NBAlert variant="warning" message="Anda harus online untuk clock in. Sambungkan ke internet terlebih dahulu." />
          </View>
        )}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <NBAlert variant="warning" message="Mode offline. Clock out akan disinkronkan saat online." />
          </View>
        )}

        {/* Selfie full-screen preview modal */}
        <ImagePreviewModal
          uri={selfiePreviewUri}
          onClose={() => setSelfiePreviewUri(null)}
          title="Selfie Clock In"
        />

        {/* Submit Button — fixed at bottom, scrollable area sits above */}
        <View style={styles.submitBar}>
          <NBButton
            title={isClockIn ? 'Clock In' : 'Clock Out'}
            onPress={isClockIn ? () => handleClockIn(goBack) : () => handleClockOut(goBack)}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={
              isSubmitting || location.loading || !location.latitude || !location.longitude ||
              (isClockIn && !isOnline)
            }
            accessibilityLabel={isClockIn ? 'Tombol Clock In' : 'Tombol Clock Out'}
            accessibilityHint={
              isClockIn
                ? (isWithinBoundary ? 'Mulai shift kerja dengan verifikasi lokasi' : 'Mulai shift kerja — Anda di luar area, absen tetap dicatat')
                : 'Akhiri shift kerja saat ini'
            }
          />
        </View>
      </View>
    </NBBackgroundPattern>
  );
};

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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  timeHeroTime: {
    letterSpacing: 0.5,
  },
  centerText: {
    textAlign: 'center',
  },
  cardLabel: {
    marginBottom: nbSpacing.xs,
  },
  gpsCard: {
    backgroundColor: nbColors.statusIdleBg,
  },
  staticCard: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  errorText: {
    marginBottom: nbSpacing.sm,
  },
  selfieImage: {
    width: '100%',
    height: 250,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.gray200,
  },
  selfiePrompt: {
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  submitBar: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.md,
    paddingTop: nbSpacing.xs,
    backgroundColor: 'transparent',
  },
  offlineWarning: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.xs,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.warning,
    ...nbShadows.sm,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withAlpha(nbColors.danger, 0.08),
    padding: nbSpacing.sm,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    ...nbShadows.sm,
  },
  offlineBannerText: {
    flex: 1,
  },
  clockInInfo: {
    marginTop: nbSpacing.sm,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.gray50,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  timerValue: {
    letterSpacing: 1,
    textAlign: 'center',
  },
  clockInTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray300,
  },
});


export default ClockInOutScreen;
