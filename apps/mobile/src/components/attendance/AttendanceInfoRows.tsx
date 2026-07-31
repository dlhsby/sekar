import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { InfoTableRow } from '../common';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { StatusPill, type StatusTone } from '../home/StatusPill';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface PillProps {
  tone: StatusTone;
  label: string;
  /** Tap the pill → open a detail (why-status / map). */
  onPress?: () => void;
  disabled?: boolean;
  a11yLabel?: string;
}

interface AttendanceInfoRowsProps {
  /** Attendance status (Terlambat / Tepat Waktu / Tanpa Jadwal) as a pill. */
  status: PillProps;
  /** In/out-area pill. */
  areaStatus: PillProps;
  onRefreshLocation?: () => void;
  refreshingLocation?: boolean;
  /** "Detail Shift →" — omit to hide the link. */
  onDetailShift?: () => void;
}

/** A tappable (or static) StatusPill, sized identically for both rows. */
function PillValue({ pill, testID }: { pill: PillProps; testID?: string }): React.JSX.Element {
  const node = <StatusPill tone={pill.tone} label={pill.label} />;
  if (!pill.onPress) return node;
  return (
    <TouchableOpacity
      onPress={pill.onPress}
      disabled={pill.disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={pill.a11yLabel}
      testID={testID}
    >
      {node}
    </TouchableOpacity>
  );
}

/**
 * AttendanceInfoRows — the shared, simplified body of the attendance card.
 *
 * Only the at-a-glance state lives on the card: **Status Kehadiran** (tap → why)
 * and **Status Area** (pill tap → the Area Tugas map, with a refresh beside it).
 * Both rows are the same InfoTableRow with a StatusPill value, so they read as a
 * consistent pair. Everything else moved into the Detail Shift modal. Used
 * identically by the home hero and the Rekam Kehadiran card.
 */
export function AttendanceInfoRows({
  status,
  areaStatus,
  onRefreshLocation,
  refreshingLocation = false,
  onDetailShift,
}: AttendanceInfoRowsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <InfoTableRow
        label={t('attendance:infoCard.status')}
        value={
          <View style={styles.pillValue}>
            <PillValue pill={status} testID="attendance-status-badge" />
          </View>
        }
      />
      <InfoTableRow
        label={t('attendance:infoCard.areaStatus')}
        value={
          <View style={styles.pillValue}>
            <PillValue pill={areaStatus} testID="attendance-area-status" />
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
                  <MaterialCommunityIcons name="refresh" size={15} color={nbColors.black} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
      {onDetailShift ? (
        // Same ghost button as Jadwal / Log Kehadiran on the entry card — it is
        // the same kind of affordance (go look at more detail), so it should not
        // be styled as a third thing.
        <NBButton
          title={t('attendance:infoCard.detailShift')}
          leftIcon="calendar-clock"
          variant="ghost"
          size="sm"
          onPress={onDetailShift}
          style={styles.detailLink}
          testID="shift-detail-link"
        />
      ) : null}
    </View>
  );
}

// A fixed height so both pill rows are exactly the same size regardless of the
// refresh button, which is sized to match.
const ROW_HEIGHT = 28;

const styles = StyleSheet.create({
  root: {
    gap: nbSpacing.sm,
  },
  pillValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: nbSpacing.sm,
    height: ROW_HEIGHT,
    flexShrink: 1,
  },
  // Standard NB icon button — sized to match the pill row so the two rows stay
  // the same height.
  refreshButton: {
    width: ROW_HEIGHT,
    height: ROW_HEIGHT,
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
});

export default AttendanceInfoRows;
