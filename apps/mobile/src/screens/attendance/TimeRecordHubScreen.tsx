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
import { formatShiftLabel } from '../../utils/shiftDisplay';
import { nbColors } from '../../constants/nbTokens';
import { screenContentGrow } from '../../constants/layout';
import type { MainTabScreenProps } from '../../types/navigation.types';
import type { PunchSession } from '../../types/api.types';

/** Device-local YYYY-MM-DD (WIB for field users, matching the app's convention). */
function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function TimeRecordHubScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<MainTabScreenProps<'TimeRecordHub'>['navigation']>();
  const { rosterShift, refetch: refetchRoster } = useTodayRoster();
  const { displayShift, refetch: refetchShiftState } = useCurrentShiftState();
  const date = todayLocal();

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
  const shiftLabel = formatShiftLabel(displayShift(rosterShift), t('attendance:hub.noShift'));

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Section header — mirrors the home "KEHADIRAN" divider for consistency */}
        <HomeSectionDivider label={t('navigation:screens.timeRecordHub')} first />

        <AttendanceEntryCard
          date={date}
          shiftLabel={shiftLabel}
          jamMasuk={jamMasuk}
          jamKeluar={jamKeluar}
          hasRecordToday={hasRecordToday}
          onClockIn={() => navigation.navigate('Absensi', { action: 'clock_in' })}
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
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: screenContentGrow,
});

export default TimeRecordHubScreen;
