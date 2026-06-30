import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBEmptyState, NBBackgroundPattern, NBText, NBSkeleton } from '../../components/nb';
import { StatusPill } from '../../components/home/StatusPill';
import { getMySchedule, getMySchedules, getMyRoster } from '../../services/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import { formatDateLong } from '../../utils/dateUtils';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { Schedule, DailySchedule, DailyScheduleStatus } from '../../types/shift.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

type ScheduleState = 'active' | 'upcoming' | 'ended';

/** WIB-naive local YYYY-MM-DD (matches the DATE columns the API returns). */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Normalise a backend date ("2026-05-18" or ISO) to YYYY-MM-DD. */
const dateKey = (s: string): string => s.slice(0, 10);

function scheduleState(s: Schedule, today: string): ScheduleState {
  const eff = dateKey(s.effective_date);
  const end = s.end_date ? dateKey(s.end_date) : null;
  if (eff > today) return 'upcoming';
  if (end && end < today) return 'ended';
  return 'active';
}

const STATE_PILL: Record<ScheduleState, { tone: 'ok' | 'info' | 'neutral'; label: string }> = {
  active: { tone: 'ok', label: 'Aktif' },
  upcoming: { tone: 'info', label: 'Akan Datang' },
  ended: { tone: 'neutral', label: 'Selesai' },
};

const ROSTER_STATUS_PILL: Record<DailyScheduleStatus, { tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; label: string }> = {
  present: { tone: 'ok', label: 'Hadir' },
  planned: { tone: 'ok', label: 'Direncanakan' },
  absent: { tone: 'bad', label: 'Tidak Hadir' },
  leave_sick: { tone: 'warn', label: 'Cuti Sakit' },
  leave_annual: { tone: 'warn', label: 'Cuti Tahunan' },
  replaced: { tone: 'neutral', label: 'Digantikan' },
  off: { tone: 'neutral', label: 'Libur' },
};

/** Strip "HH:MM:SS" → "HH:MM". */
const hhmm = (t?: string): string => (t ? t.slice(0, 5) : '--:--');

// ─── Row ──────────────────────────────────────────────────────────────────────

function RosterRow({ roster }: { roster: DailySchedule }): React.JSX.Element {
  const pill = ROSTER_STATUS_PILL[roster.status];
  const shift = roster.shift_definition;
  const areasText = roster.daily_schedule_areas
    .map((a) => a.area.name)
    .join(', ') || 'Area belum ditetapkan';

  return (
    <View style={[styles.card, styles.rosterCard]} testID={`roster-${roster.id}`}>
      <View style={styles.cardHeader}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.rosterLabel}>
          Jadwal Hari Ini
        </NBText>
        <StatusPill dot tone={pill.tone} label={pill.label} />
      </View>

      <View style={styles.shiftRow}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={nbColors.gray600} />
        <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
          {shift ? `${shift.name} · ${hhmm(shift.start_time)}–${hhmm(shift.end_time)}` : 'Shift belum ditetapkan'}
        </NBText>
      </View>

      <View style={styles.areaRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color={nbColors.gray600} />
        <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
          {areasText}
        </NBText>
      </View>

      {roster.rayon && (
        <View style={styles.rayonRow}>
          <MaterialCommunityIcons name="map-outline" size={16} color={nbColors.gray600} />
          <NBText variant="caption" color="gray600" style={styles.shiftText}>
            {roster.rayon.name}
          </NBText>
        </View>
      )}
    </View>
  );
}

function ScheduleRow({ schedule, today }: { schedule: Schedule; today: string }): React.JSX.Element {
  const state = scheduleState(schedule, today);
  const pill = STATE_PILL[state];
  const shift = schedule.shift_definition;
  const areaName = schedule.area?.name ?? 'Area belum ditetapkan';

  return (
    <View style={[styles.card, state === 'active' && styles.cardActive]} testID={`schedule-${schedule.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.areaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={nbColors.gray600} />
          <NBText variant="body" color="black" style={styles.areaName}>
            {areaName}
          </NBText>
        </View>
        <StatusPill dot tone={pill.tone} label={pill.label} />
      </View>

      <View style={styles.shiftRow}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={nbColors.gray600} />
        <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
          {shift ? `${shift.name} · ${hhmm(shift.start_time)}–${hhmm(shift.end_time)}` : 'Shift belum ditetapkan'}
        </NBText>
      </View>

      <View style={styles.dateRow}>
        <MaterialCommunityIcons name="calendar-range" size={16} color={nbColors.gray600} />
        <NBText variant="caption" color="gray600" style={styles.dateText}>
          {formatDateLong(schedule.effective_date)}
          {schedule.end_date ? ` – ${formatDateLong(schedule.end_date)}` : ' – Berlangsung'}
        </NBText>
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function MyScheduleScreen(): React.JSX.Element {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const assignedAreas = useAppSelector((state) => state.auth.assignedAreas);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [roster, setRoster] = useState<DailySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayKey(), []);

  const fetchSchedules = useCallback(async () => {
    if (!userId) {
      setError('Sesi tidak valid. Silakan masuk kembali.');
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      // Fetch today's roster + default roster
      const [mineRes, currentRes, rosterRes] = await Promise.all([
        getMySchedules(userId),
        getMySchedule(),
        getMyRoster(today),
      ]);
      if (mineRes.error) {
        setError(mineRes.error);
        return;
      }

      const explicit = mineRes.data ?? [];
      const shift = currentRes.data?.shift_definition;
      setRoster(rosterRes.data ?? null);

      // Synthesize one entry per assigned area using the worker's single shift.
      const synthetic: Schedule[] = assignedAreas.map(
        (area) =>
          ({
            id: `derived-${area.id}`,
            user_id: userId,
            area_id: area.id,
            area,
            shift_definition_id: shift?.id,
            shift_definition: shift,
            effective_date: today,
            end_date: undefined,
            created_at: today,
            updated_at: today,
          }) as unknown as Schedule,
      );

      // Explicit schedules override the derived entry for the same area.
      const explicitAreaIds = new Set(explicit.map((s) => s.area_id));
      const merged = [
        ...explicit,
        ...synthetic.filter((s) => !explicitAreaIds.has(s.area_id)),
      ];

      const order: Record<ScheduleState, number> = { active: 0, upcoming: 1, ended: 2 };
      const sorted = merged.sort((a, b) => {
        const byState = order[scheduleState(a, today)] - order[scheduleState(b, today)];
        if (byState !== 0) return byState;
        return dateKey(b.effective_date).localeCompare(dateKey(a.effective_date));
      });
      setSchedules(sorted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, today, assignedAreas]);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchSchedules();
  }, [fetchSchedules]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NBBackgroundPattern />
      {isLoading ? (
        <View style={styles.listContent}>
          <NBSkeleton height={96} style={styles.skeleton} />
          <NBSkeleton height={96} style={styles.skeleton} />
          <NBSkeleton height={96} style={styles.skeleton} />
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <NBEmptyState
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={48} color={nbColors.danger} />}
            title="Gagal memuat jadwal"
            description={error}
            ctaLabel="Coba Lagi"
            onCTA={onRefresh}
          />
        </View>
      ) : schedules.length === 0 && !roster ? (
        <View style={styles.stateWrap}>
          <NBEmptyState
            icon={<MaterialCommunityIcons name="calendar-blank-outline" size={48} color={nbColors.gray500} />}
            title="Tanpa area tetap"
            description="Anda belum ditugaskan ke area tetap (bekerja ad-hoc sesuai penugasan). Anda tetap bisa melakukan clock-in."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={nbColors.primary} />
          }
        >
          {roster && <RosterRow roster={roster} />}
          {schedules.map((s) => (
            <ScheduleRow key={s.id} schedule={s} today={today} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: nbColors.bgCanvas },
  listContent: { padding: nbSpacing.md, gap: nbSpacing.sm },
  stateWrap: { flex: 1, justifyContent: 'center', padding: nbSpacing.xl },
  skeleton: { borderRadius: nbRadius.base, marginBottom: nbSpacing.sm },
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
    ...nbShadows.sm,
  },
  cardActive: { borderColor: nbColors.primary },
  rosterCard: { borderColor: nbColors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: nbSpacing.sm },
  rosterLabel: { color: nbColors.gray600 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs, flexShrink: 1 },
  areaName: { fontWeight: '700', flexShrink: 1 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  shiftText: { flexShrink: 1 },
  rayonRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  dateText: { flexShrink: 1 },
});

export default MyScheduleScreen;
