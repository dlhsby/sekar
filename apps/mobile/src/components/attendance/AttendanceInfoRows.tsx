import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { InfoTableRow, DateTimeValue } from '../common';
import { NBText } from '../nb/NBText';
import { StatusPill, type StatusTone } from '../home/StatusPill';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface AttendanceInfoRowsProps {
  /** "Shift 3 · 21:00–05:00" — omit/null to hide the Jadwal Shift row. */
  shiftText?: string | null;
  /** Attendance-status badge (Terlambat / Tepat Waktu / Tanpa Jadwal). */
  statusBadge: React.ReactNode;
  /** Clock-in datetime → "Mulai clock in" row. Null hides it (not clocked in). */
  clockInTime?: string | Date | null;
  /** Elapsed shift time "HH:MM" → "Durasi" row. Null hides it. */
  durationText?: string | null;
  /** The live "Waktu Sekarang" clock. */
  currentTime: Date;
  /** Assigned area or scope name, e.g. "Rayon Barat 1". */
  areaName: string;
  /** In/out-area pill. */
  areaStatus: {
    tone: StatusTone;
    label: string;
    /** Tap the pill → open the map. */
    onPress?: () => void;
    disabled?: boolean;
    a11yLabel?: string;
  };
  /** Current GPS position → "Lokasi sekarang" row (coords + accuracy + refresh). */
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    loading?: boolean;
  };
  onRefreshLocation?: () => void;
  /** Record-page only: the "out of area" note shown below Lokasi sekarang. */
  notes?: React.ReactNode;
  /** "Detail Shift →" — omit to hide the link. */
  onDetailShift?: () => void;
}

/**
 * AttendanceInfoRows — the shared body of the attendance card.
 *
 * Renders the SAME labelled rows, in the SAME order, for both the home
 * "Kehadiran" hero and the Rekam Kehadiran card, so the two are identical:
 * Jadwal Shift · Status Kehadiran · Mulai clock in · Durasi · Waktu Sekarang ·
 * Area Ditugaskan · Status Area · Lokasi sekarang · (notes) · Detail Shift.
 * The MASUK/KELUAR summary sits above this (AttendanceSummaryRow), and the record
 * page adds the "Jenis Kehadiran" selector + notes.
 */
export function AttendanceInfoRows({
  shiftText,
  statusBadge,
  clockInTime,
  durationText,
  currentTime,
  areaName,
  areaStatus,
  location,
  onRefreshLocation,
  notes,
  onDetailShift,
}: AttendanceInfoRowsProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasCoords = location.latitude != null && location.longitude != null;

  const pill = <StatusPill tone={areaStatus.tone} label={areaStatus.label} />;

  return (
    <View style={styles.root}>
      {shiftText ? <InfoTableRow label={t('attendance:infoCard.shift')} value={shiftText} /> : null}
      <InfoTableRow label={t('attendance:infoCard.status')} value={statusBadge} />
      {clockInTime ? (
        <InfoTableRow
          label={t('attendance:infoCard.clockInStart')}
          value={<DateTimeValue source={clockInTime} />}
        />
      ) : null}
      {durationText ? (
        <InfoTableRow label={t('attendance:infoCard.duration')} value={durationText} />
      ) : null}
      <InfoTableRow
        label={t('attendance:infoCard.currentTime')}
        value={<DateTimeValue source={currentTime} />}
      />
      <InfoTableRow label={t('attendance:infoCard.assignedArea')} value={areaName} numberOfLines={1} />
      <InfoTableRow
        label={t('attendance:infoCard.areaStatus')}
        value={
          areaStatus.onPress ? (
            <TouchableOpacity
              onPress={areaStatus.onPress}
              disabled={areaStatus.disabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={areaStatus.a11yLabel}
            >
              {pill}
            </TouchableOpacity>
          ) : (
            pill
          )
        }
      />
      <InfoTableRow
        label={t('attendance:infoCard.currentLocation')}
        value={
          <View style={styles.locationValue}>
            <View style={styles.locationText}>
              {location.loading && !hasCoords ? (
                <NBText variant="body-sm" color="gray600">
                  {t('attendance:infoCard.locating')}
                </NBText>
              ) : hasCoords ? (
                <>
                  <NBText variant="mono-sm" color="black" numberOfLines={1}>
                    {location.latitude!.toFixed(5)}, {location.longitude!.toFixed(5)}
                  </NBText>
                  {location.accuracy != null ? (
                    <NBText variant="caption" color="gray600">
                      {t('attendance:infoCard.accuracy', { value: Math.round(location.accuracy) })}
                    </NBText>
                  ) : null}
                </>
              ) : (
                <NBText variant="body-sm" color="gray600">
                  {t('attendance:infoCard.locationUnavailable')}
                </NBText>
              )}
            </View>
            {onRefreshLocation ? (
              <TouchableOpacity
                onPress={onRefreshLocation}
                disabled={location.loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('attendance:infoCard.refreshLocation')}
                testID="attendance-refresh-location"
                style={styles.refreshButton}
              >
                {location.loading ? (
                  <ActivityIndicator size="small" color={nbColors.black} />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={18} color={nbColors.black} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
      {notes ?? null}
      {onDetailShift ? (
        <TouchableOpacity
          onPress={onDetailShift}
          activeOpacity={0.7}
          accessibilityRole="button"
          style={styles.detailLink}
          testID="shift-detail-link"
        >
          <NBText variant="mono-sm" color="gray700" uppercase style={styles.detailText}>
            {t('attendance:infoCard.detailShift')}
          </NBText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Self-contained vertical rhythm — the card owns its row spacing (the shared
  // component had no internal gap, so rows touched). sm (8) matches the original
  // hero spacing.
  root: {
    gap: nbSpacing.sm,
  },
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: nbSpacing.sm,
    flexShrink: 1,
  },
  locationText: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  // Standard NB icon button — hard border + hard-edge shadow, matching NBButton.
  refreshButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    ...nbShadows.sm,
  },
  detailLink: {
    alignSelf: 'flex-start',
  },
  detailText: {
    letterSpacing: 0.6,
  },
});

export default AttendanceInfoRows;
