/**
 * Attendance Detail Screen — one day's attendance summary, opened from the
 * Kehadiran list. Shows Masuk / Keluar / late status / total duration, plus a
 * button that opens the day's shifts in a modal (reusing TodayWorkHoursModal).
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import {
  useRoute,
  useFocusEffect,
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { NBBackgroundPattern, NBText, NBButton, NBBadge, NBCard } from '../../components/nb';
import { InfoTableRow } from '../../components/common';
import { TodayWorkHoursModal, ShiftDetailModal } from '../../components/modals';
import { getAttendanceForDate } from '../../services/api/shiftsApi';
import { summarizeAttendance } from '../../utils/attendance';
import { formatLongDate, formatTime, calculateDuration } from '../../utils/dateUtils';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import type { Shift } from '../../types/models.types';

function formatWorkedMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${minutes}m`;
}

export function AttendanceDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<MainTabParamList, 'AttendanceDetail'>>();
  const navigation = useNavigation<MainTabScreenProps<'AttendanceDetail'>['navigation']>();
  const { date } = route.params;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shiftsModalVisible, setShiftsModalVisible] = useState(false);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);

  const fetchDay = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAttendanceForDate(date);
      setShifts(response.data?.shifts ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void fetchDay();
    }, [fetchDay]),
  );

  const summary = summarizeAttendance(shifts, null);
  const totalMinutes = shifts.reduce((acc, shift) => {
    const end = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date();
    return acc + calculateDuration(new Date(shift.clock_in_time), end).totalMinutes;
  }, 0);

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600">{t('attendance:detail.loading')}</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (shifts.length === 0) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.centered}>
          <NBText variant="body" color="gray600">{t('attendance:detail.noAttendance')}</NBText>
          <NBButton title={t('attendance:detail.button.back')} variant="secondary" onPress={() => navigation.navigate('Attendance')} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <NBCard style={styles.card}>
          <View style={styles.rows}>
            <InfoTableRow label={t('attendance:detail.labels.date')} value={formatLongDate(`${date}T00:00:00`)} />
            <InfoTableRow label={t('attendance:detail.labels.clockIn')} value={summary.firstClockIn ? formatTime(summary.firstClockIn) : '—'} />
            <InfoTableRow label={t('attendance:detail.labels.clockOut')} value={summary.lastClockOut ? formatTime(summary.lastClockOut) : '—'} />
            <InfoTableRow
              label={t('attendance:detail.labels.status')}
              value={
                <NBBadge
                  text={summary.isLate ? t('attendance:detail.status.late') : t('attendance:detail.status.onTime')}
                  color={summary.isLate ? 'danger' : 'success'}
                  size="sm"
                />
              }
            />
            <InfoTableRow label={t('attendance:detail.labels.duration')} value={formatWorkedMinutes(totalMinutes)} />
            <InfoTableRow label={t('attendance:detail.labels.shiftCount')} value={t('attendance:detail.shiftCount', { count: shifts.length })} />
          </View>

          <NBButton
            title={t('attendance:detail.button.viewShifts')}
            variant="secondary"
            fullWidth
            onPress={() => setShiftsModalVisible(true)}
            style={styles.detailButton}
            accessibilityLabel={t('attendance:detail.a11y.viewShifts')}
          />
        </NBCard>
      </ScrollView>

      <TodayWorkHoursModal
        visible={shiftsModalVisible}
        onClose={() => setShiftsModalVisible(false)}
        shifts={shifts}
        date={date}
        onShiftPress={(shift) => {
          setShiftsModalVisible(false);
          setDetailShift(shift);
        }}
      />

      <ShiftDetailModal
        visible={!!detailShift}
        onClose={() => setDetailShift(null)}
        shift={detailShift}
      />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: nbSpacing.md },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: nbSpacing.md,
    padding: nbSpacing.lg,
  },
  card: { padding: nbSpacing.md },
  rows: { gap: nbSpacing.sm },
  detailButton: { marginTop: nbSpacing.lg },
});

export default AttendanceDetailScreen;
