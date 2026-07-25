import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { InfoTableRow } from '../common';
import { NBText } from '../nb/NBText';
import { StatusPill, type StatusTone } from '../home/StatusPill';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface AttendanceInfoRowsProps {
  /** Attendance-status badge (Terlambat / Tepat Waktu / Tanpa Jadwal). */
  statusBadge: React.ReactNode;
  /** Tap the status badge → "why am I late / on time" explanation. */
  onPressStatus?: () => void;
  /** In/out-area pill. */
  areaStatus: {
    tone: StatusTone;
    label: string;
    /** Tap the pill → open the Area Tugas map. */
    onPress?: () => void;
    disabled?: boolean;
    a11yLabel?: string;
  };
  onRefreshLocation?: () => void;
  refreshingLocation?: boolean;
  /** "Detail Shift →" — omit to hide the link. */
  onDetailShift?: () => void;
}

/**
 * AttendanceInfoRows — the shared, simplified body of the attendance card.
 *
 * Only the at-a-glance state lives on the card: **Status Kehadiran** (tap → why)
 * and **Status Area** (pill tap → the Area Tugas map, with a refresh beside it).
 * Everything else (shift, times, area, coordinates) moved into the Detail Shift
 * modal to keep the card uncluttered. Used identically by the home hero and the
 * Rekam Kehadiran card; the MASUK/KELUAR summary sits above this.
 */
export function AttendanceInfoRows({
  statusBadge,
  onPressStatus,
  areaStatus,
  onRefreshLocation,
  refreshingLocation = false,
  onDetailShift,
}: AttendanceInfoRowsProps): React.JSX.Element {
  const { t } = useTranslation();

  const pill = <StatusPill tone={areaStatus.tone} label={areaStatus.label} />;

  return (
    <View style={styles.root}>
      <InfoTableRow
        label={t('attendance:infoCard.status')}
        value={
          onPressStatus ? (
            <TouchableOpacity
              onPress={onPressStatus}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('attendance:infoCard.whyStatus')}
              testID="attendance-status-badge"
            >
              {statusBadge}
            </TouchableOpacity>
          ) : (
            statusBadge
          )
        }
      />
      <InfoTableRow
        label={t('attendance:infoCard.areaStatus')}
        value={
          <View style={styles.areaStatusValue}>
            {areaStatus.onPress ? (
              <TouchableOpacity
                onPress={areaStatus.onPress}
                disabled={areaStatus.disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={areaStatus.a11yLabel}
                testID="attendance-area-status"
              >
                {pill}
              </TouchableOpacity>
            ) : (
              pill
            )}
            {onRefreshLocation ? (
              <TouchableOpacity
                onPress={onRefreshLocation}
                disabled={refreshingLocation}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('attendance:infoCard.refreshLocation')}
                testID="attendance-refresh-location"
                style={styles.refreshButton}
              >
                {refreshingLocation ? (
                  <ActivityIndicator size="small" color={nbColors.black} />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={18} color={nbColors.black} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
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
  root: {
    gap: nbSpacing.sm,
  },
  areaStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: nbSpacing.sm,
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
