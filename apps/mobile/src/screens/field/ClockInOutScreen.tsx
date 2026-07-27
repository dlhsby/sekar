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
import { ShiftPickerSheet } from '../../components/modals/ShiftPickerSheet';
import type { ShiftOption } from '../../types/api.types';
import { AttendanceStatusSheet, type AttendanceStatusKind } from '../../components/modals/AttendanceStatusSheet';
import { AttendanceInfoRows } from '../../components/attendance/AttendanceInfoRows';
import { AttendanceTimesRow } from '../../components/attendance/AttendanceTimesRow';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBBackgroundPattern, NBText, NBAlert, NBCollapsibleCard } from '../../components/nb';
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
import { pickDisplayShift, formatShiftLabel } from '../../utils/shiftDisplay';
import { useAppSelector } from '../../store/hooks';
import { useTranslation } from 'react-i18next';
import type { RouteProp } from '@react-navigation/native';
import type { MainTabScreenProps, MainTabParamList } from '../../types/navigation.types';

/**
 * Clock In/Out Screen
 * Phase 2C: Soft geofencing (warnings only), auto-detect area from schedule
 * Uses Neo Brutalism design system
 */
type ClockInOutRouteProp = RouteProp<MainTabParamList, 'Absensi'>;

export const ClockInOutScreen = ({ route }: { route?: ClockInOutRouteProp }): React.JSX.Element => {
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
    currentShift,
    scheduledShift,
    isLate,
    attendanceState,
    scheduleScope,
    mapArea,
    hasScheduleToday,
    shiftOptions,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  } = useClockInOut();

  const [mapVisible, setMapVisible] = useState(false);
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [shiftPickerVisible, setShiftPickerVisible] = useState(false);
  // ADR-055: which shift a clock-in is attributed to. Defaults to the server's
  // suggested option; the picker only appears when there is a choice to make.
  const [selectedShift, setSelectedShift] = useState<ShiftOption | null>(null);
  useEffect(() => {
    setSelectedShift(shiftOptions.find((o) => o.is_default) ?? shiftOptions[0] ?? null);
  }, [shiftOptions]);
  const [detailShiftVisible, setDetailShiftVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);

  // The attendance label the worker will record. The hub's Clock In / Clock Out
  // buttons pass an explicit `action`; otherwise it defaults from shift state
  // (open shift → Clock Out, none → Clock In). The "Ubah Label Waktu" picker can
  // still override it (dangling/overrun shift, back-to-back shifts).
  const routeAction = route?.params?.action;
  const defaultAction: AttendanceAction = routeAction ?? (isClockIn ? 'clock_in' : 'clock_out');
  const [attendanceAction, setAttendanceAction] = useState<AttendanceAction>(defaultAction);
  useEffect(() => {
    setAttendanceAction(routeAction ?? (isClockIn ? 'clock_in' : 'clock_out'));
  }, [isClockIn, routeAction]);

  // SEKAR holds at most one open shift, so only one label is valid at a time:
  // you cannot clock in with a shift already open, nor clock out without one.
  const invalidAction: AttendanceAction | undefined = currentShift ? 'clock_in' : 'clock_out';
  const actionMismatch = attendanceAction === invalidAction;
  const mismatchHint = currentShift
    ? t('attendance:clockInOut.clockInUnavailable')
    : t('attendance:clockInOut.clockOutUnavailable');

  const isClockInAction = attendanceAction === 'clock_in';

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // Ad-hoc / patrol workers with no assigned area may still clock in (GPS is
  // recorded, geofencing stays soft, shift created with location_id = null).
  const userRole = useAppSelector((state) => state.auth.user?.role);

  // ── Shared attendance-card data (see AttendanceInfoRows) ──────────────────
  // Resolved here so the Rekam Kehadiran card renders the SAME core rows as the
  // home hero: Jadwal Shift · Status · Area Ditugaskan · Status Area.
  // Attribution-first (the ranked shiftOptions), roster fallback — the SAME
  // resolution the home + hub Kehadiran cards use, so all three read identically.
  const noScheduleText = t('attendance:clockInOut.noScheduleToday');
  const shiftText = formatShiftLabel(pickDisplayShift(shiftOptions, scheduledShift), noScheduleText);
  // The full label of the currently-selected picker option (name + window).
  const selectedShiftText = selectedShift
    ? formatShiftLabel(pickDisplayShift([selectedShift], scheduledShift), shiftText)
    : shiftText;

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

  // Scope label for the Detail Shift modal (kota/rayon/kawasan-scope shift).
  const scopeLabel =
    scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
      ? t(`attendance:clockInOut.scope.${scheduleScope.scope}`, { name: scheduleScope.name ?? '' })
      : null;

  // Which explanation the Status Kehadiran pill opens.
  const statusKind: AttendanceStatusKind = !hasScheduleToday
    ? 'noSchedule'
    : isLate
      ? 'late'
      : 'onTime';

  // Record-page "notice" — the out-of-area (or no-boundary) reassurance banner,
  // shown below the pills. The card is where the worker is about to clock out, so
  // "absen tetap dicatat" belongs here.
  const noticeNode =
    areaState === 'outside' ? (
      <NBAlert variant="warning" message={t('attendance:gpsSection.outsideBoundary')} />
    ) : areaState === 'scope' ? (
      <NBAlert
        variant="info"
        message={t('attendance:gpsSection.scopeAssigned', { scope: scheduleScope.name ?? '' })}
      />
    ) : areaState === 'none' ? (
      <NBAlert variant="info" message={t('attendance:gpsSection.noArea')} />
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

  // The on-time/late/no-schedule pill — a StatusPill (same style as Status Area)
  // shown in the card header while collapsed and in the "Status" body row.
  const statusTone: StatusTone = !hasScheduleToday
    ? 'neutral'
    : attendanceState === 'outside_window'
      ? 'warn'
      : isLate
        ? 'bad'
        : 'ok';
  const statusLabel = !hasScheduleToday
    ? t('attendance:clockInOut.noScheduleChip')
    : attendanceState === 'outside_window'
      ? t('attendance:clockInOut.outsideWindowChip')
      : isLate
        ? t('attendance:list.statusChip.late')
        : t('attendance:list.statusChip.onTime');
  const statusPill = <StatusPill tone={statusTone} label={statusLabel} />;

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
            headerRight={(expanded) => (expanded ? null : statusPill)}
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
              {/* Shift — always shown so the worker sees which shift they're
                  recording against. When clocking in and the attribution window
                  offers a choice (near midnight / dangling, ADR-055), the pencil
                  opens the picker to switch shift; otherwise it's read-only. */}
              {(() => {
                const canSwitchShift = isClockInAction && shiftOptions.length > 0;
                return (
                  <InfoTableRow
                    label={t('attendance:infoCard.shift')}
                    value={
                      canSwitchShift ? (
                        <TouchableOpacity
                          onPress={() => setShiftPickerVisible(true)}
                          accessibilityRole="button"
                          accessibilityLabel={t('attendance:clockInOut.selectShiftTitle')}
                          testID="clockinout-pick-shift"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.typeValue}
                        >
                          <NBText variant="body" color="black">
                            {selectedShiftText}
                          </NBText>
                          <MaterialCommunityIcons name="pencil" size={15} color={nbColors.primary} />
                        </TouchableOpacity>
                      ) : (
                        <NBText variant="body" color="black">
                          {shiftText}
                        </NBText>
                      )
                    }
                  />
                );
              })()}
              {/* Jam Masuk / Jam Keluar — same shared row as the entry card, so the
                  clock-in page and home/hub cards render times identically. The
                  colours still flag a late clock-in / early clock-out. */}
              <AttendanceTimesRow
                jamMasuk={attendance.firstClockIn}
                jamKeluar={attendance.lastClockOut}
                masukColor={
                  attendance.firstClockIn
                    ? !hasScheduleToday
                      ? 'black'
                      : attendance.isLate
                        ? 'dangerDark'
                        : 'successDark'
                    : 'gray400'
                }
                keluarColor={
                  attendance.lastClockOut
                    ? !hasScheduleToday
                      ? 'black'
                      : attendance.isEarlyLeave
                        ? 'dangerDark'
                        : 'successDark'
                    : 'gray400'
                }
              />
              {/* Shared, simplified rows — identical to the home "Kehadiran" hero:
                  Status Kehadiran (tap → why) + Status Area (pill → map, refresh
                  beside). Everything else lives in the Detail Shift modal. */}
              <AttendanceInfoRows
                status={{
                  tone: statusTone,
                  label: statusLabel,
                  onPress: () => setStatusSheetVisible(true),
                  a11yLabel: t('attendance:infoCard.whyStatus'),
                }}
                areaStatus={{
                  tone: areaStatusTone,
                  label: areaStatusLabel,
                  onPress: location.latitude != null ? () => setMapVisible(true) : undefined,
                  a11yLabel: t('attendance:clockInOut.viewOnMap'),
                }}
                onRefreshLocation={getCurrentLocation}
                refreshingLocation={location.loading}
                onDetailShift={currentShift ? () => setDetailShiftVisible(true) : undefined}
              />
              {/* Out-of-area notice — kept on the record page (where you clock out). */}
              {noticeNode}
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
          onRefresh={getCurrentLocation}
          refreshing={location.loading}
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

        {/* Shift picker (ADR-055 attribution window) — near midnight / dangling. */}
        <ShiftPickerSheet
          visible={shiftPickerVisible}
          options={shiftOptions}
          value={selectedShift}
          onSelect={setSelectedShift}
          onClose={() => setShiftPickerVisible(false)}
        />

        {/* Shift detail — opened from the "Detail Shift" link; now carries the
            fields the card no longer shows (shift window, durasi, waktu sekarang,
            lokasi sekarang). */}
        <ShiftDetailModal
          visible={detailShiftVisible}
          onClose={() => setDetailShiftVisible(false)}
          shift={currentShift ?? null}
          scopeLabel={scopeLabel}
          shiftText={shiftText}
          durationText={currentShift ? timer.slice(0, 5) : null}
          currentTime={currentTime}
          currentLocation={{
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          }}
        />

        {/* Why "Terlambat / Tepat Waktu" — opened from the Status Kehadiran pill. */}
        <AttendanceStatusSheet
          visible={statusSheetVisible}
          onClose={() => setStatusSheetVisible(false)}
          status={statusKind}
          clockInTime={currentShift?.clock_in_time ?? null}
          shiftStart={scheduledShift?.start_time ?? null}
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
            onPress={
              isClockInAction ? () => handleClockIn(goBack, selectedShift) : () => handleClockOut(goBack)
            }
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            // ADR-055/ADR-002: clock-in is allowed offline now — it queues and
            // syncs later (idempotent client-uuid punch), so no online gate.
            disabled={
              isSubmitting || location.loading || !location.latitude || !location.longitude ||
              actionMismatch
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
});


export default ClockInOutScreen;
