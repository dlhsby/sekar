import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ImagePreviewModal } from '../../components/common';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import config from '../../constants/config';
import { useClockInOut } from '../../hooks';
import { useAppSelector } from '../../store/hooks';
import { formatDateTime } from '../../utils/dateUtils';
import type { MainTabScreenProps } from '../../types/navigation.types';

/**
 * Clock In/Out Screen
 * Phase 2C: Soft geofencing (warnings only), auto-detect area from schedule
 * Uses Neo Brutalism design system
 */
export const ClockInOutScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MainTabScreenProps<'ClockInOut'>['navigation']>();
  const [isAreaExpanded, setIsAreaExpanded] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(true);
  const [selfiePreviewUri, setSelfiePreviewUri] = useState<string | null>(null);

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
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Anda belum ditugaskan ke area manapun</Text>
            <Text style={styles.subtitle}>Hubungi supervisor untuk penugasan area</Text>
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
        {/* Scrollable content area — sits above the submit button */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Offline Banner (top of scroll) */}
          {!isOnline && isClockIn && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerIcon}>📵</Text>
              <Text style={styles.offlineBannerText}>Mode Offline - Clock in memerlukan koneksi</Text>
            </View>
          )}

          {/* Header Subtitle */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>
              {isClockIn
                ? 'Ambil foto diri dan konfirmasi lokasi untuk memulai shift'
                : 'Konfirmasi lokasi untuk mengakhiri shift'}
            </Text>
          </View>

          {/* Area Info Card - Collapsible (hidden for rayon-scoped roles without area) */}
          {assignedArea ? (
            <NBCard variant="elevated" style={styles.card}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setIsAreaExpanded(v => !v)}
                accessibilityLabel={isAreaExpanded ? 'Sembunyikan detail area' : 'Tampilkan detail area'}
              >
                <View style={styles.collapsibleHeaderLeft}>
                  <Text style={styles.cardTitle}>Area Ditugaskan</Text>
                  <Text style={styles.areaName}>{assignedArea.name}</Text>
                </View>
                <Text style={styles.chevron}>{isAreaExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {isAreaExpanded && (
                <View style={styles.collapsibleBody}>
                  {assignedArea.address && <Text style={styles.areaAddress}>{assignedArea.address}</Text>}
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
                </View>
              )}
            </NBCard>
          ) : isRayonScoped ? (
            <NBCard variant="elevated" style={styles.card}>
              <Text style={styles.cardTitle}>Cakupan Rayon</Text>
              <Text style={styles.areaName}>Clock in tanpa area spesifik</Text>
            </NBCard>
          ) : null}

          {/* Selfie Card (Clock In only) */}
          {isClockIn && (
            <NBCard variant="elevated" style={styles.card}>
              <Text style={styles.cardTitle}>Foto Selfie</Text>
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
                  <Text style={styles.selfiePrompt}>Ambil selfie untuk verifikasi identitas</Text>
                  <NBButton title="Ambil Selfie" onPress={handleCaptureSelfie} variant="primary" fullWidth />
                </View>
              )}
            </NBCard>
          )}

          {/* Location Card - Collapsible, default open */}
          <NBCard variant="elevated" style={styles.card}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setIsLocationExpanded(v => !v)}
              accessibilityLabel={isLocationExpanded ? 'Sembunyikan detail lokasi' : 'Tampilkan detail lokasi'}
            >
              <Text style={styles.cardTitle}>Lokasi Anda</Text>
              <Text style={styles.chevron}>{isLocationExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {isLocationExpanded && (
              location.error ? (
                <View style={styles.collapsibleBody}>
                  <Text style={styles.errorText}>{location.error}</Text>
                  <NBButton title="Coba Lagi" onPress={getCurrentLocation} variant="secondary" fullWidth />
                </View>
              ) : location.latitude && location.longitude ? (
                <View style={styles.collapsibleBody}>
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
                  {location.accuracy !== null && location.accuracy > config.GPS_ACCURACY_THRESHOLD && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningIcon}>⚠️</Text>
                      <Text style={styles.warningText}>GPS kurang akurat. Pindah ke area terbuka untuk hasil lebih baik.</Text>
                    </View>
                  )}
                  {/* Location Status Banner - bilateral feedback for both clock-in and clock-out */}
                  {isWithinBoundary ? (
                    <View style={styles.insideAreaBanner}>
                      <Text style={styles.insideAreaIcon}>✅</Text>
                      <Text style={styles.insideAreaText}>Anda berada di dalam area kerja</Text>
                    </View>
                  ) : (
                    <View style={styles.softWarningBanner}>
                      <Text style={styles.softWarningIcon}>⚠️</Text>
                      <Text style={styles.softWarningText}>Anda berada di luar area kerja. Absen tetap dicatat.</Text>
                    </View>
                  )}
                  <NBButton title="Perbarui Lokasi" onPress={getCurrentLocation} variant="info" fullWidth disabled={location.loading} />
                  {!isClockIn && currentShift && (
                    <View style={styles.clockInInfo}>
                      <View style={styles.timerContainer}>
                        <Text style={styles.timerLabel}>Waktu Shift:</Text>
                        <Text style={styles.timerValue}>{timer}</Text>
                      </View>
                      <View style={styles.clockInTimeRow}>
                        <Text style={styles.clockInLabel}>Clock In:</Text>
                        <Text style={styles.clockInTime}>{formatDateTime(currentShift.clock_in_time)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.collapsibleBody}>
                  <ActivityIndicator size="small" color={nbColors.primary} />
                </View>
              )
            )}
          </NBCard>
        </ScrollView>

        {/* Offline warnings — between scroll and submit button */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>⚠️ Anda harus online untuk clock in. Sambungkan ke internet terlebih dahulu.</Text>
          </View>
        )}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>⚠️ Mode offline. Clock out akan disinkronkan saat online.</Text>
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
            accessibilityHint={
              isClockIn ? 'Mulai shift kerja dengan verifikasi foto diri dan lokasi' : 'Akhiri shift kerja saat ini'
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
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  header: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.sm,
  },
  headerSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    lineHeight: 18,
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    padding: 10,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleHeaderLeft: {
    flex: 1,
  },
  collapsibleBody: {
    marginTop: nbSpacing.sm,
  },
  chevron: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
    marginLeft: nbSpacing.sm,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  areaName: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: 2,
  },
  areaAddress: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.danger,
    marginBottom: nbSpacing.sm,
  },
  selfieImage: {
    width: '100%',
    height: 250,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.gray[200],
  },
  selfiePrompt: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
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
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.warning,
    ...nbShadows.sm,
  },
  offlineWarningText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.warning,
    textAlign: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.danger,
    padding: nbSpacing.sm,
    marginBottom: nbSpacing.sm,
    borderRadius: 0,
    borderWidth: nbBorders.base,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderRadius: 0,
    borderWidth: nbBorders.base,
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
  insideAreaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    marginBottom: nbSpacing.xs,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.accentGrass,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  insideAreaIcon: {
    fontSize: 18,
    marginRight: nbSpacing.sm,
  },
  insideAreaText: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.white,
  },
  softWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    marginBottom: nbSpacing.xs,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.warning,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  softWarningIcon: {
    fontSize: 18,
    marginRight: nbSpacing.sm,
  },
  softWarningText: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  clockInInfo: {
    marginTop: nbSpacing.sm,
    padding: 6,
    backgroundColor: nbColors.gray[50],
    borderRadius: 0,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  timerLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: 1,
  },
  timerValue: {
    fontSize: 40,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.warning,
    letterSpacing: 1,
    textAlign: 'center',
  },
  clockInTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: nbColors.gray[300],
  },
  clockInLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  clockInTime: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
});

export default ClockInOutScreen;
