/**
 * TimeRecordHubScreen — the single "Pencatatan Waktu" entry point (ADR-055,
 * Catapa-style). Replaces the two Menu tiles (Kehadiran + Pencatatan Waktu) with
 * one hub: today's shift + Jam Masuk/Keluar + Clock In / Clock Out buttons, a
 * link to the full log, and today's punch timeline inline.
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { NBBackgroundPattern, NBText, NBButton, NBCard } from '../../components/nb';
import { PunchTimeline } from '../../components/attendance/PunchTimeline';
import { getPunchLog } from '../../services/api/shiftsApi';
import { useTodayRoster } from '../../hooks/useTodayRoster';
import { formatLongDate, formatTime } from '../../utils/dateUtils';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
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
  const { rosterShift, hasScheduleToday } = useTodayRoster();
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
      void fetchToday();
    }, [fetchToday]),
  );

  // Jam Masuk = earliest session's first-in; Jam Keluar = latest last-out.
  const jamMasuk = sessions.map((s) => s.jam_masuk).filter(Boolean).sort()[0] ?? null;
  const closed = sessions.map((s) => s.jam_keluar).filter(Boolean).sort();
  const jamKeluar = closed.length ? closed[closed.length - 1] : null;
  const hasRecordToday = sessions.length > 0;

  const shiftLabel = hasScheduleToday && rosterShift
    ? `${rosterShift.name} · ${formatTime(`2000-01-01T${rosterShift.start_time}`)}–${formatTime(`2000-01-01T${rosterShift.end_time}`)}`
    : t('attendance:hub.noShift');

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <NBCard style={styles.card}>
          {!hasRecordToday && (
            <NBText variant="body-sm" color="gray600" style={styles.emptyNote}>
              {t('attendance:hub.noRecordThisShift')}
            </NBText>
          )}

          {/* Today's shift */}
          <View style={styles.shiftRow}>
            <NBText variant="body-sm" color="gray600">
              {formatLongDate(`${date}T00:00:00`)}
            </NBText>
            <NBText variant="body" color="black">{shiftLabel}</NBText>
          </View>

          {/* Jam Masuk / Jam Keluar */}
          <View style={styles.timesRow}>
            <View style={styles.timeCol}>
              <NBText variant="caption" color="gray600" uppercase>{t('attendance:hub.jamMasuk')}</NBText>
              <NBText variant="h3" color={jamMasuk ? 'black' : 'gray400'}>
                {jamMasuk ? formatTime(jamMasuk) : '— —'}
              </NBText>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCol}>
              <NBText variant="caption" color="gray600" uppercase>{t('attendance:hub.jamKeluar')}</NBText>
              <NBText variant="h3" color={jamKeluar ? 'black' : 'gray400'}>
                {jamKeluar ? formatTime(jamKeluar) : '— —'}
              </NBText>
            </View>
          </View>

          {/* Clock In / Clock Out */}
          <View style={styles.buttonsRow}>
            <NBButton
              title={t('attendance:list.button.clockIn')}
              leftIcon="login"
              variant="primary"
              style={styles.actionButton}
              onPress={() => navigation.navigate('Absensi', { action: 'clock_in' })}
              testID="hub-clock-in"
            />
            <NBButton
              title={t('attendance:list.button.clockOut')}
              leftIcon="logout"
              variant="secondary"
              style={styles.actionButton}
              onPress={() => navigation.navigate('Absensi', { action: 'clock_out' })}
              testID="hub-clock-out"
            />
          </View>
        </NBCard>

        {/* Link to the full log */}
        <NBButton
          title={t('attendance:hub.viewLog')}
          variant="ghost"
          leftIcon="history"
          fullWidth
          onPress={() => navigation.navigate('Attendance')}
          testID="hub-view-log"
          style={styles.logLink}
        />

        {/* Today's punch timeline */}
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.todayHeader}>
          {t('attendance:hub.todayLog')}
        </NBText>
        {hasRecordToday ? (
          <PunchTimeline date={date} />
        ) : (
          <NBCard style={styles.card}>
            <NBText variant="body-sm" color="gray500" style={styles.emptyNote}>
              {t('attendance:hub.todayEmpty')}
            </NBText>
          </NBCard>
        )}
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: nbSpacing.md, gap: nbSpacing.sm },
  card: { padding: nbSpacing.md },
  emptyNote: { textAlign: 'center', paddingVertical: nbSpacing.sm },
  shiftRow: { gap: 2, marginBottom: nbSpacing.md },
  timesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: nbSpacing.md },
  timeCol: { flex: 1, alignItems: 'center', gap: nbSpacing.xs },
  timeDivider: { width: 1, height: 40, backgroundColor: nbColors.gray200 },
  buttonsRow: { flexDirection: 'row', gap: nbSpacing.sm },
  actionButton: { flex: 1 },
  logLink: { marginTop: nbSpacing.xs },
  todayHeader: { marginTop: nbSpacing.sm },
});

export default TimeRecordHubScreen;
