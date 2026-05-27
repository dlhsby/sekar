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
import { ImagePreviewModal } from '../../components/common';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBBackgroundPattern, NBText, NBAlert, NBBadge } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import {
  nbColors,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbRadius,
  withAlpha,
} from '../../constants/nbTokens';
import config from '../../constants/config';
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
  const [isAreaExpanded, setIsAreaExpanded] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(true);
  const [isSelfieExpanded, setIsSelfieExpanded] = useState(false);
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
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <NBText variant="h2" color="black" style={styles.errorText}>Anda belum ditugaskan ke area manapun</NBText>
            <NBText variant="body" color="gray600" style={styles.subtitle}>Hubungi supervisor untuk penugasan area</NBText>
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
            <NBText variant="body" color="gray600" style={styles.loadingText}>Mendapatkan lokasi Anda...</NBText>
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
          <View style={styles.timeHero}>
            <NBText variant="display" color="black" style={styles.timeHeroTime}>
              {formatTimeHero(currentTime)}
            </NBText>
            <NBText variant="mono-sm" color="gray600">
              {formatDateHero(currentTime)}
            </NBText>
            <NBText variant="body-sm" color="gray600" style={{ marginTop: nbSpacing.xs, textAlign: 'center' }}>
              {isClockIn
                ? 'Ambil foto diri dan konfirmasi lokasi untuk memulai shift'
                : 'Konfirmasi lokasi untuk mengakhiri shift'}
            </NBText>
          </View>

          {/* Area Info Card - Collapsible (hidden for rayon-scoped roles without area) */}
          {assignedArea ? (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setIsAreaExpanded(v => !v)}
                accessibilityLabel={isAreaExpanded ? 'Sembunyikan detail area' : 'Tampilkan detail area'}
              >
                <View style={styles.collapsibleHeaderLeft}>
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>Area Ditugaskan</NBText>
                  <NBText variant="h3" color="black">{assignedArea.name}</NBText>
                </View>
                <MaterialCommunityIcons
                  name={isAreaExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={nbColors.gray700}
                  style={styles.chevron}
                />
              </TouchableOpacity>
              {isAreaExpanded && (
                <View style={styles.collapsibleBody}>
                  {assignedArea.address && <NBText variant="body-sm" color="gray600" style={{ marginBottom: nbSpacing.sm }}>{assignedArea.address}</NBText>}
                  <View style={styles.infoRow}>
                    <NBText variant="body-sm" color="gray600" style={styles.infoLabel}>Tipe Area:</NBText>
                    <NBText variant="body" color="black" style={styles.infoValue}>{assignedArea.area_type?.name || 'N/A'}</NBText>
                  </View>
                  {assignedArea.gps_lat != null && assignedArea.gps_lng != null && (
                    <View style={styles.infoRow}>
                      <NBText variant="body-sm" color="gray600" style={styles.infoLabel}>Koordinat GPS:</NBText>
                      <NBText variant="body" color="black" style={styles.infoValue}>
                        {Number(assignedArea.gps_lat).toFixed(6)}, {Number(assignedArea.gps_lng).toFixed(6)}
                      </NBText>
                    </View>
                  )}
                  {assignedArea.radius_meters != null && (
                    <View style={styles.infoRow}>
                      <NBText variant="body-sm" color="gray600" style={styles.infoLabel}>Radius Batas:</NBText>
                      <NBText variant="body" color="black" style={styles.infoValue}>{assignedArea.radius_meters}m</NBText>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : isRayonScoped ? (
            <View style={styles.card}>
              <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>Cakupan Rayon</NBText>
              <NBText variant="h3" color="black">Clock in tanpa area spesifik</NBText>
            </View>
          ) : null}

          {/* Selfie Card (Clock In only) - Collapsible, default closed */}
          {isClockIn && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setIsSelfieExpanded(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={isSelfieExpanded ? 'Sembunyikan foto selfie' : 'Tampilkan foto selfie'}
                accessibilityState={{ expanded: isSelfieExpanded }}
              >
                <View style={styles.collapsibleHeaderLeft}>
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>Foto Selfie</NBText>
                  {selfie
                    ? <NBText variant="body-sm" color="success">Sudah diambil</NBText>
                    : <NBText variant="body-sm" color="gray600">Opsional</NBText>
                  }
                </View>
                <MaterialCommunityIcons
                  name={isSelfieExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={nbColors.gray700}
                  style={styles.chevron}
                />
              </TouchableOpacity>
              {isSelfieExpanded && (
                <View style={styles.collapsibleBody}>
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
                </View>
              )}
            </View>
          )}

          {/* Location Card */}
          <View style={[
            styles.card,
            (location.latitude != null && !isWithinBoundary) ? styles.cardOutside : null,
          ]}>
            {/* Always-visible GPS status summary */}
            <View style={styles.gpsStatusRow}>
              <MaterialCommunityIcons
                name={location.latitude ? 'crosshairs-gps' : 'crosshairs'}
                size={18}
                color={location.latitude
                  ? (isWithinBoundary ? nbColors.statusActive : nbColors.statusOutside)
                  : nbColors.gray500
                }
                style={{ marginRight: nbSpacing.sm }}
              />
              <View style={{ flex: 1 }}>
                <NBText variant="body-sm" color={location.latitude ? 'black' : 'gray600'}>
                  {location.latitude
                    ? (assignedArea?.name ?? `${location.latitude.toFixed(4)}, ${location.longitude?.toFixed(4)}`)
                    : 'Mendapatkan lokasi...'}
                </NBText>
                {location.accuracy !== null && (
                  <NBText variant="caption" color="gray600">±{location.accuracy.toFixed(0)}m akurasi</NBText>
                )}
              </View>
              {location.latitude && (
                <NBBadge
                  text={isWithinBoundary ? 'DI AREA' : 'LUAR AREA'}
                  color={isWithinBoundary ? 'success' : 'danger'}
                  size="sm"
                />
              )}
            </View>

            {/* Area status alert */}
            {location.latitude != null && (
              <View style={{ marginTop: nbSpacing.sm }}>
                {isWithinBoundary ? (
                  <NBAlert
                    variant="success"
                    message="Anda berada di dalam area kerja"
                  />
                ) : (
                  <NBAlert
                    variant="warning"
                    message="Anda berada di luar area kerja. Absen tetap dicatat."
                  />
                )}
              </View>
            )}

            {/* Collapsible detail toggle */}
            <TouchableOpacity
              style={[styles.collapsibleHeader, { marginTop: nbSpacing.sm }]}
              onPress={() => setIsLocationExpanded(v => !v)}
              accessibilityLabel={isLocationExpanded ? 'Sembunyikan detail lokasi' : 'Tampilkan detail lokasi'}
            >
              <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>Detail Lokasi</NBText>
              <MaterialCommunityIcons
                name={isLocationExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={nbColors.gray700}
                style={styles.chevron}
              />
            </TouchableOpacity>
            {isLocationExpanded && (
              location.error ? (
                <View style={styles.collapsibleBody}>
                  <NBText variant="body-sm" color="danger" style={styles.errorText}>
                    {location.error}
                  </NBText>
                  <NBButton title="Coba Lagi" onPress={getCurrentLocation} variant="secondary" fullWidth />
                </View>
              ) : location.latitude && location.longitude ? (
                <View style={styles.collapsibleBody}>
                  <View style={styles.infoRow}>
                    <NBText variant="body-sm" color="gray700" style={styles.infoLabel}>GPS:</NBText>
                    <NBText variant="body-sm" style={styles.infoValue}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </NBText>
                  </View>
                  {location.accuracy !== null && (
                    <View style={styles.infoRow}>
                      <NBText variant="body-sm" color="gray700" style={styles.infoLabel}>Akurasi:</NBText>
                      <NBText variant="body-sm" style={styles.infoValue}>{location.accuracy.toFixed(0)}m</NBText>
                    </View>
                  )}
                  {location.accuracy !== null && location.accuracy > config.GPS_ACCURACY_THRESHOLD && (
                    <View style={styles.warningBox}>
                      <MaterialCommunityIcons
                        name="crosshairs-question"
                        size={20}
                        color={nbColors.statusIdle}
                        style={{ marginRight: nbSpacing.sm }}
                      />
                      <NBText variant="body-sm" color="gray700" style={styles.warningText}>
                        GPS kurang akurat. Pindah ke area terbuka untuk hasil lebih baik.
                      </NBText>
                    </View>
                  )}
                  <NBButton title="Perbarui Lokasi" onPress={getCurrentLocation} variant="info" fullWidth disabled={location.loading} />
                  {!isClockIn && currentShift && (
                    <View style={styles.clockInInfo}>
                      <View style={styles.timerContainer}>
                        <NBText variant="body-sm" color="gray600">
                          Waktu Shift:
                        </NBText>
                        <NBText variant="display" color="statusIdle" style={styles.timerValue}>{timer}</NBText>
                      </View>
                      <View style={styles.clockInTimeRow}>
                        <NBText variant="caption" color="gray600" style={styles.clockInLabel}>Clock In:</NBText>
                        <NBText variant="body-sm" style={styles.clockInTime}>
                          {formatDateTime(currentShift.clock_in_time)}
                        </NBText>
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
          </View>
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
  timeHero: {
    alignItems: 'center',
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    backgroundColor: withAlpha(nbColors.primary, 0.1),
    borderRadius: nbRadius.md,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  timeHeroTime: {
    letterSpacing: 1,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardOutside: {
    borderColor: nbColors.statusOutside,
    backgroundColor: withAlpha(nbColors.statusOutsideBg, 0.5),
  },
  header: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  subtitle: {
    marginBottom: nbSpacing.sm,
  },
  headerSubtitle: {},
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
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
    marginLeft: nbSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  infoLabel: {},
  infoValue: {},
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    padding: nbSpacing.sm,
    backgroundColor: nbColors.statusIdleBg,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  warningText: {
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
  clockInLabel: {},
  clockInTime: {},
});

export default ClockInOutScreen;
