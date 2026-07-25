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
import { ImagePreviewModal, InfoTableRow } from '../../components/common';
import { LocationMapModal, ShiftDetailModal } from '../../components/modals';
import { AttendanceTypeSheet, type AttendanceAction } from '../../components/modals/AttendanceTypeSheet';
import { AttendanceInfoRows } from '../../components/attendance/AttendanceInfoRows';
import { AttendanceSummaryRow } from '../../components/home/AttendanceSummaryRow';
import type { StatusTone } from '../../components/home/StatusPill';
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
import { workerMapMarker, scopeAreaMarker } from '../../utils/mapUtils';
import { useAppSelector } from '../../store/hooks';
import { useTranslation } from 'react-i18next';
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
    attendance,
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
    mapArea,
    hasScheduleToday,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  } = useClockInOut();

  const [mapVisible, setMapVisible] = useState(false);
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [detailShiftVisible, setDetailShiftVisible] = useState(false);

  // The attendance label the worker will record. Defaults from shift state — an
  // open shift → Clock Out, none → Clock In — but the "Ubah Label Waktu" picker
  // can override it (dangling/overrun shift, back-to-back shifts). Re-seeded from
  // state whenever the open-shift status flips (e.g. after a submit).
  const defaultAction: AttendanceAction = isClockIn ? 'clock_in' : 'clock_out';
  const [attendanceAction, setAttendanceAction] = useState<AttendanceAction>(defaultAction);
  useEffect(() => {
    setAttendanceAction(isClockIn ? 'clock_in' : 'clock_out');
  }, [isClockIn]);

  // SEKAR holds at most one open shift, so only one label is valid at a time:
  // you cannot clock in with a shift already open, nor clock out without one.
  const invalidAction: AttendanceAction | undefined = currentShift ? 'clock_in' : 'clock_out';
  const actionMismatch = attendanceAction === invalidAction;
  const mismatchHint = currentShift
    ? t('attendance:clockInOut.clockInUnavailable')
    : t('attendance:clockInOut.clockOutUnavailable');

  const isClockInAction = attendanceAction === 'clock_in';

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // No hard block for a missing area: ad-hoc / patrol workers with no assigned
  // area may still clock in (GPS is recorded, geofencing stays soft, and the
  // shift is created with location_id = null). The form surfaces "no area" inline;
  // district-scoped roles show a "no specific area" note instead.
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isDistrictScoped = userRole === 'admin_rayon' || userRole === 'kepala_rayon';

  // ── Shared attendance-card data (see AttendanceInfoRows) ──────────────────
  // Resolved here so the Rekam Kehadiran card renders the SAME core rows as the
  // home hero: Jadwal Shift · Status · Area Ditugaskan · Status Area.
  const shiftText = scheduledShift
    ? `${scheduledShift.name} · ${scheduledShift.start_time.slice(0, 5)}–${scheduledShift.end_time.slice(0, 5)}`
    : t('attendance:clockInOut.noScheduleToday');

  // Single "Area Ditugaskan" label — the lokasi, else the named scope, else a
  // district-coverage / no-area fallback. The multi-lokasi list is kept as extra
  // rows below the shared block.
  const isMultiArea = rosterAreas.length > 1;
  const areaName = isMultiArea
    ? t('attendance:clockInOut.multiArea', { count: rosterAreas.length })
    : assignedArea?.name ??
      (scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
        ? t(`attendance:clockInOut.scope.${scheduleScope.scope}`, { name: scheduleScope.name ?? '' })
        : isDistrictScoped
          ? t('attendance:clockInOut.noSpecificArea')
          : t('attendance:infoCard.noArea'));

  const areaStatusTone: StatusTone = location.loading
    ? 'neutral'
    : areaState === 'within'
      ? 'ok'
      : areaState === 'outside'
        ? 'bad'
        : areaState === 'scope'
          ? 'info'
          : 'neutral';
  const areaStatusLabel = location.loading
    ? t('attendance:infoCard.locating')
    : areaState === 'within'
      ? t('attendance:infoCard.inArea')
      : areaState === 'outside'
        ? t('attendance:infoCard.outArea')
        : areaState === 'scope'
          ? t('attendance:infoCard.scopeUndefined')
          : t('attendance:infoCard.noArea');

  // Record-page "notes" — the out-of-area (or no-boundary) reassurance banner,
  // shown below Lokasi sekarang. Home never passes this.
  const notesNode =
    areaState === 'outside' ? (
      <NBAlert variant="warning" message={t('attendance:gpsSection.outsideBoundary')} />
    ) : areaState === 'none' ? (
      <NBAlert variant="info" message={t('attendance:gpsSection.noArea')} />
    ) : areaState === 'scope' ? (
      <NBAlert
        variant="info"
        message={t('attendance:gpsSection.scopeAssigned', { scope: scheduleScope.name ?? '' })}
      />
    ) : null;

  // Override navigator header: FieldHomeHeader owns all 3 columns (title + onBack).
  // The title is now the STABLE page name "Rekam Kehadiran" — the action
  // (clock in vs out) lives on the in-page label selector + primary button, not
  // the header, so the screen reads as one reusable surface.
  // try/catch suppresses the "outside a screen" error thrown by NavigationContainer in
  // test/Storybook contexts where setOptions exists but cannot be called. All other
  // errors (e.g. render crash inside FieldHomeHeader) are re-thrown.
  useEffect(() => {
    try {
      navigation.setOptions({
        headerTitle: () => (
          <FieldHomeHeader title={t('attendance:clockInOut.pageTitle')} onBack={goBack} />
        ),
      });
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message.includes('outside a screen')) {
        throw e;
      }
    }
  }, [navigation, goBack, t]);

  // The on-time/late/no-schedule pill — shown in the card HEADER while collapsed
  // (at-a-glance), and in the "Status" body row while expanded. One source.
  const statusBadge = hasScheduleToday ? (
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
  );

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
          {/* Blocked-choice warning — the selected label can't proceed given the
              current shift state (clock in with a shift open, or clock out with
              none). Explains why the button below is disabled. */}
          {actionMismatch && (
            <View style={styles.mismatchAlert}>
              <NBAlert variant="warning" message={mismatchHint} />
            </View>
          )}

          {/* Offline Banner (top of scroll) */}
          {!isOnline && isClockInAction && (
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

          {/* Informasi Kehadiran — opens expanded so the attendance-type row and
              the shift/area details are visible at a glance. The status pill shows
              in the header only while collapsed (the "Status" body row carries it
              when open). */}
          <NBCollapsibleCard
            defaultExpanded
            headerLeft={
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
                {t('attendance:clockInOut.attendanceInfo')}
              </NBText>
            }
            headerRight={(expanded) => (expanded ? null : statusBadge)}
            accessibilityLabel={t('attendance:clockInOut.attendanceInfo')}
          >
            <View style={styles.infoTable}>
              {/* Jenis Kehadiran — the record page's distinctive first row; tap to
                  switch Clock In / Clock Out via the "Ubah Label Waktu" picker. */}
              <InfoTableRow
                label={t('attendance:clockInOut.attendanceType')}
                value={
                  <TouchableOpacity
                    onPress={() => setTypeSheetVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('attendance:clockInOut.changeLabel')}
                    testID="clockinout-change-label"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.typeValue}
                  >
                    <NBText variant="body" color="black">
                      {isClockInAction
                        ? t('attendance:list.button.clockIn')
                        : t('attendance:list.button.clockOut')}
                    </NBText>
                    <MaterialCommunityIcons name="pencil" size={15} color={nbColors.primary} />
                  </TouchableOpacity>
                }
              />
              {/* MASUK / KELUAR summary — same as the home hero. */}
              <AttendanceSummaryRow
                firstClockIn={attendance.firstClockIn}
                lastClockOut={attendance.lastClockOut}
                isLate={attendance.isLate}
                isEarlyLeave={attendance.isEarlyLeave}
                neutral={!hasScheduleToday}
              />
              {/* Shared attendance rows — identical to the home "Kehadiran" hero. */}
              <AttendanceInfoRows
                shiftText={shiftText}
                statusBadge={statusBadge}
                clockInTime={currentShift?.clock_in_time ?? null}
                durationText={currentShift ? timer.slice(0, 5) : null}
                currentTime={currentTime}
                areaName={areaName}
                areaStatus={{
                  tone: areaStatusTone,
                  label: areaStatusLabel,
                  onPress: location.latitude != null ? () => setMapVisible(true) : undefined,
                  a11yLabel: t('attendance:clockInOut.viewOnMap'),
                }}
                location={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  accuracy: location.accuracy,
                  loading: location.loading,
                }}
                onRefreshLocation={getCurrentLocation}
                notes={notesNode}
                onDetailShift={currentShift ? () => setDetailShiftVisible(true) : undefined}
              />
              {/* Multi-lokasi assignment — list the places clock-in is accepted at.
                  The backend records whichever one the GPS lands in. */}
              {isMultiArea && (
                <>
                  {rosterAreas.map((a) => (
                    <InfoTableRow key={a.id} label="" value={`• ${a.name}`} numberOfLines={1} />
                  ))}
                  <NBText variant="body-sm" color="gray600">
                    {t('attendance:clockInOut.multiAreaHint')}
                  </NBText>
                </>
              )}
            </View>
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
                  {isClockInAction ? t('attendance:clockInOut.captureForVerification') : t('attendance:clockInOut.captureForClockOutVerification')}
                </NBText>
                <NBButton title={t('attendance:clockInOut.captureSelfie')} onPress={handleCaptureSelfie} variant="secondary" fullWidth />
              </View>
            )}
          </NBCollapsibleCard>
        </ScrollView>

        {/* Offline warnings — between scroll and submit button */}
        {!isOnline && isClockInAction && (
          <View style={styles.offlineWarning}>
            <NBAlert variant="warning" message={t('attendance:clockInOut.onlineRequiredForClockIn')} />
          </View>
        )}
        {!isOnline && !isClockInAction && (
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

        {/* GPS + assigned-area map — draws where the worker is vs the boundary
            they're supposed to be inside, so "luar area" is actionable. */}
        <LocationMapModal
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          title={t('attendance:clockInOut.mapTitle')}
          location={{
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            isWithinArea: isWithinBoundary,
            updatedAt: currentTime,
          }}
          area={mapArea}
          hideAreaStatus={areaState === 'none' || areaState === 'scope'}
          // Worker + area pins come from the shared builders so the home hero's
          // map draws exactly the same markers as this one.
          workerMarker={workerMapMarker(userRole, areaState === 'outside')}
          areaMarker={mapArea ? scopeAreaMarker(scheduleScope.scope) : undefined}
        />

        {/* Attendance-type picker ("Ubah Label Waktu"). */}
        <AttendanceTypeSheet
          visible={typeSheetVisible}
          value={attendanceAction}
          onSelect={setAttendanceAction}
          onClose={() => setTypeSheetVisible(false)}
          disabledAction={invalidAction}
          disabledHint={mismatchHint}
        />

        {/* Shift detail — opened from the "Detail Shift" link in the card. */}
        <ShiftDetailModal
          visible={detailShiftVisible}
          onClose={() => setDetailShiftVisible(false)}
          shift={currentShift ?? null}
        />

        {/* Submit Button — fixed at bottom, scrollable area sits above. Its label
            and action follow the selected attendance type, not the raw shift
            state, so the "Ubah Label Waktu" choice drives it. A choice that can't
            proceed (clock in while a shift is open, or clock out with none) is
            blocked with the inline warning above. */}
        <View style={styles.submitBar}>
          <NBButton
            testID="clockinout-submit"
            title={isClockInAction ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut')}
            onPress={isClockInAction ? () => handleClockIn(goBack) : () => handleClockOut(goBack)}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={
              isSubmitting || location.loading || !location.latitude || !location.longitude ||
              actionMismatch || (isClockInAction && !isOnline)
            }
            accessibilityLabel={isClockInAction ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut')}
            accessibilityHint={
              actionMismatch
                ? mismatchHint
                : isClockInAction
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
  typeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  mismatchAlert: {
    marginBottom: nbSpacing.md,
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
  // Separates the GPS block from the attendance table inside the merged card.
  infoTable: {
    gap: nbSpacing.md,
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
});


export default ClockInOutScreen;
