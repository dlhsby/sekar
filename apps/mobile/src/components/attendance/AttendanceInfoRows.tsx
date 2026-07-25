import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { InfoTableRow } from '../common';
import { StatusPill, type StatusTone } from '../home/StatusPill';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

interface AttendanceInfoRowsProps {
  /** "Shift 3 · 21:00–05:00" — omit/null to hide the Jadwal Shift row. */
  shiftText?: string | null;
  /** Attendance-status badge (Terlambat / Tepat Waktu / Tanpa Jadwal). */
  statusBadge: React.ReactNode;
  /** Assigned area or scope name, e.g. "Rayon Barat 1". */
  areaName: string;
  /** In/out-area pill state. */
  areaStatus: {
    tone: StatusTone;
    label: string;
    /** Tap the pill → open the map. Omit to render a non-interactive pill. */
    onPress?: () => void;
    disabled?: boolean;
    a11yLabel?: string;
  };
  /** GPS refresh beside the pill. Omit to hide it. */
  onRefreshLocation?: () => void;
  refreshingLocation?: boolean;
}

/**
 * AttendanceInfoRows — the shared core of the attendance card.
 *
 * The home "Kehadiran" hero and the Rekam Kehadiran "Informasi Kehadiran" card
 * showed the same facts (shift, status, area, in/out-of-area) with divergent
 * labels and layout. This renders them ONCE, identically, so the two surfaces
 * read as the same card; each screen supplies only its own extras around it
 * (home: MASUK/KELUAR summary + Durasi + Detail Shift; Rekam: Jenis Kehadiran +
 * GPS).
 */
export function AttendanceInfoRows({
  shiftText,
  statusBadge,
  areaName,
  areaStatus,
  onRefreshLocation,
  refreshingLocation = false,
}: AttendanceInfoRowsProps): React.JSX.Element {
  const { t } = useTranslation();

  const pill = (
    <StatusPill tone={areaStatus.tone} label={areaStatus.label} />
  );

  return (
    <View>
      {shiftText ? (
        <InfoTableRow label={t('attendance:infoCard.shift')} value={shiftText} />
      ) : null}
      <InfoTableRow label={t('attendance:infoCard.status')} value={statusBadge} />
      <InfoTableRow
        label={t('attendance:infoCard.assignedArea')}
        value={areaName}
        numberOfLines={1}
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
                accessibilityRole="button"
                accessibilityLabel={t('attendance:infoCard.refreshLocation')}
                testID="attendance-refresh-location"
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
    </View>
  );
}

const styles = StyleSheet.create({
  areaStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: nbSpacing.sm,
  },
});

export default AttendanceInfoRows;
