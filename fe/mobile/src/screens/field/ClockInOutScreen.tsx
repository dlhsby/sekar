import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import config from '../../constants/config';
import { useClockInOut } from '../../hooks';
import { formatTime } from '../../utils/dateUtils';
import type { MainTabScreenProps } from '../../types/navigation.types';

/**
 * Clock In/Out Screen
 * Phase 2C: Soft geofencing (warnings only), auto-detect area from schedule
 * Uses Neo Brutalism design system
 */
export const ClockInOutScreen = (): React.JSX.Element => {
  const navigation = useNavigation<MainTabScreenProps<'ClockInOut'>['navigation']>();

  const {
    location,
    selfieUri,
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

  const goBack = () => navigation.goBack();

  // No assigned area
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Offline Banner */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerIcon}>📵</Text>
            <Text style={styles.offlineBannerText}>Mode Offline - Clock in memerlukan koneksi</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isClockIn ? 'Clock In' : 'Clock Out'}</Text>
          <Text style={styles.headerSubtitle}>
            {isClockIn
              ? 'Ambil foto diri dan konfirmasi lokasi untuk memulai shift'
              : 'Konfirmasi lokasi untuk mengakhiri shift'}
          </Text>
        </View>

        {/* Area Info Card */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Area Ditugaskan</Text>
          <Text style={styles.areaName}>{assignedArea.name}</Text>
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
        </NBCard>

        {/* Location Card */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Lokasi Anda</Text>
          {location.error ? (
            <View>
              <Text style={styles.errorText}>{location.error}</Text>
              <NBButton title="Coba Lagi" onPress={getCurrentLocation} variant="secondary" fullWidth />
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
              {location.accuracy !== null && location.accuracy > config.GPS_ACCURACY_THRESHOLD && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningText}>GPS kurang akurat. Pindah ke area terbuka untuk hasil lebih baik.</Text>
                </View>
              )}
              {!isWithinBoundary && isClockIn && (
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
                    <Text style={styles.clockInTime}>{formatTime(currentShift.clock_in_time)}</Text>
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

        {/* Offline Warning */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>⚠️ Anda harus online untuk clock in. Sambungkan ke internet terlebih dahulu.</Text>
          </View>
        )}

        {/* Clock In/Out Button */}
        <View style={styles.submitButtonContainer}>
          <NBButton
            title={isClockIn ? 'Clock In' : 'Clock Out'}
            onPress={isClockIn ? () => handleClockIn(goBack) : () => handleClockOut(goBack)}
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={
              isSubmitting || location.loading || !location.latitude || !location.longitude ||
              (isClockIn && (!selfieUri || !isOnline))
            }
            accessibilityHint={
              isClockIn ? 'Mulai shift kerja dengan verifikasi foto diri dan lokasi' : 'Akhiri shift kerja saat ini'
            }
          />
        </View>

        {/* Offline Warning for Clock-out */}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>⚠️ Mode offline. Clock out akan disinkronkan saat online.</Text>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
  },
  header: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    marginBottom: 2,
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
  submitButtonContainer: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.xs,
  },
  offlineWarning: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.sm,
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
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: 1,
  },
  timerValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.accentGrass,
    letterSpacing: 1,
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
