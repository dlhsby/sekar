import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBEmptyState, NBBackgroundPattern, NBText, NBSkeleton } from '../../components/nb';
import { StatusPill } from '../../components/home/StatusPill';
import { getMyRoster } from '../../services/api/schedulesApi';
import { useAppSelector } from '../../store/hooks';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { Schedule, ScheduleStatus } from '../../types/shift.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** WIB-naive local YYYY-MM-DD (matches the DATE columns the API returns). */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const ROSTER_STATUS_PILL: Record<ScheduleStatus, { tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; label: string }> = {
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

function RosterRow({ roster }: { roster: Schedule }): React.JSX.Element {
  const pill = ROSTER_STATUS_PILL[roster.status];
  const shift = roster.shift_definition;
  const areasText =
    roster.schedule_areas.map((a) => a.area.name).join(', ') || 'Area belum ditetapkan';

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

// ─── Screen ─────────────────────────────────────────────────────────────────

export function MyScheduleScreen(): React.JSX.Element {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [roster, setRoster] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayKey(), []);

  const fetchRoster = useCallback(async () => {
    if (!userId) {
      setError('Sesi tidak valid. Silakan masuk kembali.');
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await getMyRoster(today);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRoster(res.data ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, today]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchRoster();
  }, [fetchRoster]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NBBackgroundPattern />
      {isLoading ? (
        <View style={styles.listContent}>
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
      ) : !roster ? (
        <View style={styles.stateWrap}>
          <NBEmptyState
            icon={<MaterialCommunityIcons name="calendar-blank-outline" size={48} color={nbColors.gray500} />}
            title="Belum ada jadwal hari ini"
            description="Anda belum memiliki jadwal untuk hari ini (mungkin bekerja ad-hoc sesuai penugasan). Anda tetap bisa melakukan clock-in."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={nbColors.primary} />
          }
        >
          <RosterRow roster={roster} />
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
  rosterCard: { borderColor: nbColors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: nbSpacing.sm },
  rosterLabel: { color: nbColors.gray600 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs, flexShrink: 1 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  shiftText: { flexShrink: 1 },
  rayonRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
});

export default MyScheduleScreen;
