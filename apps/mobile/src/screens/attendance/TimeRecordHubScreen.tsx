/**
 * TimeRecordHubScreen — the single "Kehadiran" entry point (ADR-055,
 * Catapa-style). One hub: today's shift + Jam Masuk/Keluar + Clock In / Clock
 * Out buttons (via the shared AttendanceEntryCard, with Jadwal Saya / Log
 * Kehadiran links), and today's punch timeline inline. Section headers use the
 * same HomeSectionDivider as the home screen for a consistent rhythm.
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { NBBackgroundPattern, NBEmptyState } from '../../components/nb';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { PunchTimeline } from '../../components/attendance/PunchTimeline';
import { AttendanceEntryCard } from '../../components/attendance/AttendanceEntryCard';
import { getPunchLog } from '../../services/api/shiftsApi';
import { useTodayRoster } from '../../hooks/useTodayRoster';
import { useCurrentShiftState } from '../../hooks/useCurrentShiftState';
import { formatShiftLabel, pickOperativeShift, formatShiftOptionLabel } from '../../utils/shiftDisplay';
import { todayLocalDate } from '../../utils/dateUtils';
import { nbColors } from '../../constants/nbTokens';
import { screenContentGrow } from '../../constants/layout';
import type { MainTabScreenProps } from '../../types/navigation.types';
import type { PunchSession, ShiftOption } from '../../types/api.types';
import { ShiftPickerSheet } from '../../components/modals/ShiftPickerSheet';

export function TimeRecordHubScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'TimeRecordHub'>['navigation']>();
  const { rosterShift, allToday, refetch: refetchRoster } = useTodayRoster();
  const { options, displayShift, refetch: refetchShiftState } = useCurrentShiftState();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const date = todayLocalDate();

  const [sessions, setSessions] = useState<PunchSession[]>([]);

  const fetchToday = useCallback(async () => {
    try {
      const res = await getPunchLog(date);
      setSessions(res.data?.sessions ?? []);
    } catch {
      setSessions([]);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      // Keep the shift + punches fresh every time the hub is opened — the shift
      // comes from the same attribution source the clock-in screen uses.
      void fetchToday();
      void refetchRoster();
      void refetchShiftState();
    }, [fetchToday, refetchRoster, refetchShiftState]),
  );

  // Jam Masuk = earliest session's first-in; Jam Keluar = latest last-out.
  const jamMasuk = sessions.map((s) => s.jam_masuk).filter(Boolean).sort()[0] ?? null;
  const closed = sessions.map((s) => s.jam_keluar).filter(Boolean).sort();
  const jamKeluar = closed.length ? closed[closed.length - 1] : null;
  const hasRecordToday = sessions.length > 0;

  // Attribution-first (same mechanism as the clock-in screen), roster fallback.
  // On a multi-shift day `/schedules/my` returns one row that may not be the
  // operative one, so pick by the clock before handing it to the fallback.
  const operativeShift = pickOperativeShift([...allToday.map((r) => r.shift_definition), rosterShift]);
  const shiftLabel = formatShiftLabel(displayShift(operativeShift), t('attendance:hub.noShift'));

  // Every OTHER shift the worker holds today, and the picker that switches
  // which one the next punch targets (ADR-055 attribution). Only offered when
  // there is a real choice — a single candidate has nothing to switch to.
  const label = (o: ShiftOption): string =>
    formatShiftLabel(
      { name: o.shift_name ?? '', start_time: o.start_time, end_time: o.end_time },
      '',
    );
  const selected = options.find(
    (o) => `${o.service_day}:${o.shift_definition_id}` === selectedKey,
  ) ?? options.find((o) => o.is_default) ?? options[0] ?? null;
  const otherShiftLabels = options
    .filter((o) => o !== selected && !!o.start_time && !!o.end_time)
    .map((o) => formatShiftOptionLabel(o, selected?.service_day ?? date));
  const canSwitchShift = options.length > 1;
  const headingLabel = selected ? label(selected) : shiftLabel;

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Section header — mirrors the home "KEHADIRAN" divider for consistency */}
        <HomeSectionDivider label={t('navigation:screens.timeRecordHub')} first />

        <AttendanceEntryCard
          date={date}
          shiftLabel={headingLabel}
          otherShiftLabels={otherShiftLabels}
          onChangeShift={canSwitchShift ? () => setPickerVisible(true) : undefined}
          jamMasuk={jamMasuk}
          jamKeluar={jamKeluar}
          hasRecordToday={hasRecordToday}
          hasScheduleToday={!!rosterShift}
          onClockIn={() =>
            navigation.navigate('Absensi', {
              action: 'clock_in',
              shiftDefinitionId: selected?.shift_definition_id,
              serviceDay: selected?.service_day,
            })
          }
          onClockOut={() => navigation.navigate('Absensi', { action: 'clock_out' })}
          onViewSchedule={() => navigation.navigate('MySchedule')}
          onViewLog={() => navigation.navigate('Attendance')}
          testID="hub-entry-card"
        />

        {/* Today's punch timeline — section header matches the home dividers */}
        <HomeSectionDivider label={t('attendance:hub.todayLog')} />
        {hasRecordToday ? (
          <PunchTimeline date={date} />
        ) : (
          <NBEmptyState
            variant="noData"
            illustration="illo-reports"
            title={t('attendance:hub.todayEmpty')}
            compact
          />
        )}
      </ScrollView>
      <ShiftPickerSheet
        visible={pickerVisible}
        options={options}
        value={selected}
        onSelect={(o) => setSelectedKey(`${o.service_day}:${o.shift_definition_id}`)}
        onClose={() => setPickerVisible(false)}
      />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: screenContentGrow,
});

export default TimeRecordHubScreen;
