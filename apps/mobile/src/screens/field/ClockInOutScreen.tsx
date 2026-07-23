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
import { GPSLocationSection, ImagePreviewModal, InfoTableRow, DateTimeValue } from '../../components/common';
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
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/dateUtils';
import type { MainTabScreenProps } from '../../types/navigation.types';

/**
 * Clock In/Out Screen
 * Phase 2C: Soft geofencing (warnings only), auto-detect area from schedule
 * Uses Neo Brutalism design system
 */
export const ClockInOutScreen = (): React.JSX.Element => {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'Absensi'>['navigation']>();
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
    areaState,
    timer,
    isClockIn,
    isOnline,
    assignedArea,
    currentShift,
    scheduledShift,
    isLate,
    attendanceState,
    scheduleScope,
    rosterAreas,
    hasScheduleToday,
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
            title={isClockIn ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut')}
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

  // No hard block for a missing area: ad-hoc / patrol workers with no assigned
  // area may still clock in (GPS is recorded, geofencing stays soft, and the
  // shift is created with location_id = null). The form surfaces "no area" inline;
  // district-scoped roles show a "no specific area" note instead.
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isDistrictScoped = userRole === 'admin_rayon' || userRole === 'kepala_rayon';

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
            <NBText variant="body" color="gray600" style={styles.loadingText}>{t('attendance:clockInOut.gettingLocation')}</NBText>
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
              <NBText variant="body-sm" color="danger" style={styles.offlineBannerText}>{t('attendance:clockInOut.offlineBannerClockIn')}</NBText>
            </View>
          )}

          {/* Informasi Kehadiran — standard card: title left, status pill right;
              date/time + schedule + area inside the body. */}
          <NBCollapsibleCard
            headerLeft={
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
                {t('attendance:clockInOut.attendanceInfo')}
              </NBText>
            }
            headerRight={
              hasScheduleToday ? (
                <NBBadge
                  text={
                    attendanceState === 'outside_window'
                      ? t('attendance:clockInOut.outsideWindowChip')
                      : isLate
                        ? t('attendance:list.statusChip.late')
                        : t('attendance:list.statusChip.onTime')
                  }
                  color={attendanceState === 'outside_window' ? 'warning' : isLate ? 'danger' : 'success'}
                  size="sm"
                />
              ) : (
                <NBBadge text={t('attendance:clockInOut.noScheduleChip')} color="gray" size="sm" />
              )
            }
            accessibilityLabel={t('attendance:clockInOut.attendanceInfo')}
          >
            <View style={styles.infoTable}>
              <InfoTableRow label={t('attendance:clockInOut.currentTime')} value={<DateTimeValue source={currentTime} />} />
              {scheduledShift ? (
                <InfoTableRow
                  label={t('attendance:clockInOut.scheduledShift')}
                  value={`${scheduledShift.name} · ${scheduledShift.start_time.slice(0, 5)}–${scheduledShift.end_time.slice(0, 5)}`}
                />
              ) : (
                <InfoTableRow
                  label={t('attendance:clockInOut.scheduledShift')}
                  value={t('attendance:clockInOut.noScheduleToday')}
                />
              )}
              {rosterAreas.length > 1 ? (
                // Today's assignment covers several lokasi — list them all, not
                // just the primary. Clock-in is accepted at ANY of them; the
                // backend records whichever one the GPS lands in.
                <>
                  <InfoTableRow
                    label={t('attendance:clockInOut.assignedArea')}
                    value={t('attendance:clockInOut.multiArea', { count: rosterAreas.length })}
                  />
                  {rosterAreas.map((a) => (
                    <InfoTableRow
                      key={a.id}
                      label=""
                      value={`• ${a.name}`}
                      numberOfLines={1}
                    />
                  ))}
                  <NBText variant="body-sm" color="gray600">
                    {t('attendance:clockInOut.multiAreaHint')}
                  </NBText>
                </>
              ) : assignedArea ? (
                <>
                  <InfoTableRow label={t('attendance:clockInOut.assignedArea')} value={assignedArea.name} />
                  {assignedArea.address ? (
                    <InfoTableRow label={t('attendance:clockInOut.address')} value={assignedArea.address} numberOfLines={2} />
                  ) : null}
                  <InfoTableRow label={t('attendance:clockInOut.areaType')} value={assignedArea.area_type?.name || 'N/A'} />
                  {assignedArea.gps_lat != null && assignedArea.gps_lng != null && (
                    <InfoTableRow
                      label={t('attendance:clockInOut.gpsCoordinates')}
                      value={`${Number(assignedArea.gps_lat).toFixed(6)}, ${Number(assignedArea.gps_lng).toFixed(6)}`}
                    />
                  )}
                </>
              ) : scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location' ? (
                // Scheduled city / rayon / kawasan-wide: there is no single lokasi
                // to name, but the worker IS assigned — say which scope.
                <>
                  <InfoTableRow
                    label={t('attendance:clockInOut.assignedArea')}
                    value={t(`attendance:clockInOut.scope.${scheduleScope.scope}`, {
                      name: scheduleScope.name ?? '',
                    })}
                  />
                  <NBText variant="body-sm" color="gray600">
                    {t(`attendance:clockInOut.scope.${scheduleScope.scope}Hint`)}
                  </NBText>
                </>
              ) : isDistrictScoped ? (
                <InfoTableRow label={t('attendance:clockInOut.districtCoverage')} value={t('attendance:clockInOut.noSpecificArea')} />
              ) : (
                <NBText variant="body-sm" color="gray600">{t('attendance:clockInOut.noAreaAssigned')}</NBText>
              )}
            </View>
          </NBCollapsibleCard>

          {/* GPS / Location Card — above selfie; collapsed by default */}
          <NBCollapsibleCard
            headerLeft={
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>{t('attendance:clockInOut.gpsLocation')}</NBText>
            }
            headerRight={location.latitude != null
              ? areaState === 'scope'
                ? <NBBadge
                    text={t(`attendance:clockInOut.scope.${scheduleScope.scope}`, {
                      name: scheduleScope.name ?? '',
                    })}
                    color="primary"
                    size="sm"
                  />
                : areaState === 'none'
                ? <NBBadge text={t('attendance:clockInOut.noAreaChip')} color="gray" size="sm" />
                : <NBBadge
                    text={areaState === 'within' ? t('attendance:clockInOut.inBoundary') : t('attendance:clockInOut.outOfBoundary')}
                    color={areaState === 'within' ? 'success' : 'danger'}
                    size="sm"
                  />
              : undefined
            }
            accessibilityLabel={t('attendance:clockInOut.gpsLocation')}
            style={styles.gpsCard}
          >
            <GPSLocationSection
              latitude={location.latitude}
              longitude={location.longitude}
              accuracy={location.accuracy}
              isCapturing={location.loading}
              onRefresh={getCurrentLocation}
              error={location.error}
              isWithinBoundary={
                areaState === 'none' || areaState === 'scope' ? undefined : isWithinBoundary
              }
              noArea={areaState === 'none'}
              scopeLabel={
                areaState === 'scope'
                  ? t(`attendance:clockInOut.scope.${scheduleScope.scope}`, {
                      name: scheduleScope.name ?? '',
                    })
                  : undefined
              }
              areaName={assignedArea?.name}
            />
            {!isClockIn && currentShift && (
              <View style={styles.clockInInfo}>
                <View style={styles.timerContainer}>
                  <NBText variant="body-sm" color="gray600">{t("attendance:clockInOut.shiftTimeLabel")}</NBText>
                  <NBText variant="display" color="statusIdle" style={styles.timerValue}>{timer}</NBText>
                </View>
                <View style={styles.clockInTimeRow}>
                  <NBText variant="caption" color="gray600">{t("attendance:clockInOut.clockInColonLabel")}</NBText>
                  <NBText variant="body-sm">{formatDateTime(currentShift.clock_in_time)}</NBText>
                </View>
              </View>
            )}
          </NBCollapsibleCard>

          {/* Selfie Card — optional for both clock-in and clock-out */}
          <NBCollapsibleCard
            headerLeft={
              <View>
                <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>{t('attendance:clockInOut.selfiePhoto')}</NBText>
                {selfie
                  ? <NBText variant="body-sm" color="success">{t('attendance:clockInOut.captured')}</NBText>
                  : <NBText variant="body-sm" color="gray600">{t('attendance:clockInOut.optional')}</NBText>
                }
              </View>
            }
            accessibilityLabel={t('attendance:clockInOut.selfiePhoto')}
          >
            {selfie ? (
              <View>
                <TouchableOpacity
                  onPress={() => setSelfiePreviewUri(selfie.uri)}
                  accessibilityRole="button"
                  accessibilityLabel={t('attendance:clockInOut.selfiePhoto')}
                  accessibilityHint={t('attendance:clockInOut.selfiePhoto')}
                >
                  <Image source={{ uri: selfie.uri }} style={styles.selfieImage} />
                </TouchableOpacity>
                <NBButton title={t('attendance:clockInOut.retakeSelfie')} onPress={handleCaptureSelfie} variant="secondary" fullWidth />
              </View>
            ) : (
              <View>
                <NBText variant="body-sm" color="gray600" style={styles.selfiePrompt}>
                  {isClockIn ? t('attendance:clockInOut.captureForVerification') : t('attendance:clockInOut.captureForClockOutVerification')}
                </NBText>
                <NBButton title={t('attendance:clockInOut.captureSelfie')} onPress={handleCaptureSelfie} variant="secondary" fullWidth />
              </View>
            )}
          </NBCollapsibleCard>
        </ScrollView>

        {/* Offline warnings — between scroll and submit button */}
        {!isOnline && isClockIn && (
          <View style={styles.offlineWarning}>
            <NBAlert variant="warning" message={t('attendance:clockInOut.onlineRequiredForClockIn')} />
          </View>
        )}
        {!isOnline && !isClockIn && (
          <View style={styles.offlineWarning}>
            <NBAlert variant="warning" message={t('attendance:clockInOut.offlineModeClockOut')} />
          </View>
        )}

        {/* Selfie full-screen preview modal */}
        <ImagePreviewModal
          uri={selfiePreviewUri}
          onClose={() => setSelfiePreviewUri(null)}
          title={t('attendance:clockInOut.selfiePreviewTitle')}
        />

        {/* Submit Button — fixed at bottom, scrollable area sits above */}
        <View style={styles.submitBar}>
          <NBButton
            title={isClockIn ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut')}
            onPress={isClockIn ? () => handleClockIn(goBack) : () => handleClockOut(goBack)}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={
              isSubmitting || location.loading || !location.latitude || !location.longitude ||
              (isClockIn && !isOnline)
            }
            accessibilityLabel={isClockIn ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut')}
            accessibilityHint={
              isClockIn
                ? (isWithinBoundary ? t('attendance:clockInOut.startShiftWithVerification') : t('attendance:clockInOut.startShiftOutOfArea'))
                : t('attendance:clockInOut.endShiftNow')
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
  cardLabel: {
    marginBottom: nbSpacing.xs,
  },
  gpsCard: {
    backgroundColor: nbColors.statusIdleBg,
  },
  infoTable: {
    gap: nbSpacing.sm,
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
