import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { StatusPill } from '../home/StatusPill';
import { nbColors, nbSpacing, nbBorders } from '../../constants/nbTokens';
import { formatDateLong } from '../../utils/dateUtils';
import { resolveScheduleScope } from '../../utils/scheduleScope';
import { presenceTone } from '../../utils/statusHelpers';
import type { Schedule } from '../../types/shift.types';

interface ScheduleDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  roster: Schedule | null;
}

const hhmm = (t?: string | null): string => (t ? t.slice(0, 5) : '--:--');

/**
 * ScheduleDetailSheet — the tap target for a roster row in "Jadwal Saya".
 * A bottom sheet (mirrors ShiftDetailModal) that spells out one occurrence:
 * date, shift + time, status + what it means, the assigned scope/area, and the
 * rayon/kawasan/team context. Read-only — clock-in lives on its own screen.
 */
export function ScheduleDetailSheet({
  visible,
  onClose,
  roster,
}: ScheduleDetailSheetProps): React.JSX.Element {
  const { t } = useTranslation();

  const shift = roster?.shift_definition ?? null;
  const scope = roster ? resolveScheduleScope(roster) : { scope: 'none' as const, name: null };
  // Scope-aware area label: a lokasi names itself; a kawasan/rayon/kota assignment
  // names its scope rather than implying no area was assigned.
  const areaText = !roster
    ? ''
    : roster.location?.name ||
      (scope.scope !== 'none' && scope.scope !== 'location'
        ? t(`attendance:clockInOut.scope.${scope.scope}`, { name: scope.name ?? '' })
        : t('schedules:mySchedule.noAreasAssigned'));

  const statusLabel = roster ? t(`schedules:status.${roster.status}`) : '';

  return (
    <NBModal
      type="sheet"
      visible={visible}
      onClose={onClose}
      title={t('schedules:scheduleDetail.title')}
      testID="schedule-detail-sheet"
    >
      {!roster ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" style={styles.emptyText}>
            {t('schedules:mySchedule.noShiftDefined')}
          </NBText>
        </View>
      ) : (
        <View>
          <InfoRow icon="calendar-outline" label={t('schedules:scheduleDetail.date')} even>
            <NBText variant="body" color="black">
              {formatDateLong(roster.schedule_date)}
            </NBText>
          </InfoRow>

          <InfoRow icon="clock-outline" label={t('schedules:scheduleDetail.shift')}>
            <NBText variant="body" color="black">
              {shift ? shift.name : t('schedules:mySchedule.noShiftDefined')}
            </NBText>
            {!!shift && (
              <NBText variant="mono-sm" color="gray600">
                {`${hhmm(shift.start_time)}–${hhmm(shift.end_time)}`}
              </NBText>
            )}
          </InfoRow>

          <InfoRow icon="map-marker-outline" label={t('schedules:scheduleDetail.area')} even>
            <NBText variant="body" color="black">
              {areaText}
            </NBText>
            {!!roster.location?.address && (
              <NBText variant="caption" color="gray600">
                {roster.location.address}
              </NBText>
            )}
            {roster.location?.gps_lat != null && roster.location?.gps_lng != null && (
              <NBText variant="mono-sm" color="gray600">
                {`${Number(roster.location.gps_lat).toFixed(6)}, ${Number(roster.location.gps_lng).toFixed(6)}`}
              </NBText>
            )}
          </InfoRow>

          {!!roster.district && (
            <InfoRow icon="map-outline" label={t('schedules:scheduleDetail.district')}>
              <NBText variant="body" color="black">
                {roster.district.name}
              </NBText>
            </InfoRow>
          )}

          {!!roster.region && (
            <InfoRow icon="vector-square" label={t('schedules:scheduleDetail.region')} even>
              <NBText variant="body" color="black">
                {roster.region.name}
              </NBText>
            </InfoRow>
          )}

          {!!roster.team_category && (
            <InfoRow icon="account-group-outline" label={t('schedules:scheduleDetail.team')}>
              <NBText variant="body" color="black">
                {roster.team_category.name}
              </NBText>
            </InfoRow>
          )}

          <InfoRow icon="information-outline" label={t('schedules:scheduleDetail.status')} even>
            <StatusPill
              dot
              tone={presenceTone({ scheduleStatus: roster.status })}
              label={statusLabel}
            />
            <NBText variant="caption" color="gray600" style={styles.statusHint}>
              {t(`schedules:mySchedule.statusHint.${roster.status}`)}
            </NBText>
          </InfoRow>
        </View>
      )}
    </NBModal>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  even,
  children,
}: {
  icon: string;
  label: string;
  even?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={[styles.row, even && styles.rowEven]}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={nbColors.gray700}
        style={styles.rowIcon}
      />
      <NBText variant="body-sm" color="gray600" style={styles.rowLabel}>
        {label}
      </NBText>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: nbSpacing['2xl'],
  },
  emptyText: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.xs,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
    alignItems: 'flex-start',
  },
  rowEven: {
    backgroundColor: nbColors.gray50,
  },
  rowIcon: {
    marginRight: nbSpacing.sm,
    marginTop: 2,
  },
  rowLabel: {
    width: 90,
    flexShrink: 0,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  statusHint: {
    marginTop: 2,
  },
});

export default ScheduleDetailSheet;
