/**
 * AttendanceDetailModal — the "Kehadiran" detail sheet (Phase 4 M3 / CP3).
 *
 * Opened from the peek sheet's Kehadiran card. Lets the supervisor:
 *  - pick any date (defaults to today) via NBDatePicker,
 *  - toggle between the "Sudah Clock In" / "Belum Clock In" lists by tapping the
 *    two summary tiles,
 *  - tap any petugas to open their per-date attendance detail (UserAttendanceModal).
 *
 * Owns its own data fetch (`/supervisor/attendance?date=`) so the date selector
 * works without a parent round-trip; seeded with the parent's today snapshot to
 * avoid an initial flash.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { NBSkeleton } from '../nb/NBSkeleton';
import { NBDatePicker } from '../nb/NBDatePicker';
import AttendanceCard from './AttendanceCard';
import { UserAttendanceModal } from './UserAttendanceModal';
import { getAttendance } from '../../services/api/monitoringApi';
import { formatDate } from '../../utils/dateUtils';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import type { AttendanceResponse } from '../../types/api.types';

type Tab = 'clocked_in' | 'not_clocked_in';

interface AttendanceRow {
  id: string;
  fullName: string;
  areaName?: string;
  status: Tab;
  clockInTime?: string;
}

interface AttendanceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  /** Today's snapshot from the parent — seeds the modal to avoid a flash. */
  initialAttendance?: AttendanceResponse | null;
}

export function AttendanceDetailModal({
  visible,
  onClose,
  initialAttendance,
}: AttendanceDetailModalProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [data, setData] = useState<AttendanceResponse | null>(initialAttendance ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // null = no filter → show everyone (both lists), mirroring the status chips
  // in the monitoring sheet. Tapping a tile toggles that filter on/off.
  const [tab, setTab] = useState<Tab | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const dateStr = formatDate(selectedDate);

  // Fetch whenever opened or the date changes.
  useEffect(() => {
    if (!visible) { return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getAttendance({ date: dateStr })
      .then((res) => {
        if (cancelled) { return; }
        if (res.data) { setData(res.data); } else { setError(true); }
      })
      .catch(() => { if (!cancelled) { setError(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [visible, dateStr]);

  const handleRowPress = useCallback((id: string, name: string) => {
    setSelectedUser({ id, name });
  }, []);

  const clockedInTotal = data?.clocked_in?.meta.total ?? 0;
  const notClockedInTotal = data?.not_clocked_in?.meta.total ?? 0;

  const toggle = useCallback((next: Tab) => {
    setTab((cur) => (cur === next ? null : next));
  }, []);

  // Unified row list. null filter → both lists (clocked-in first, then belum).
  const rows = useMemo<AttendanceRow[]>(() => {
    const clocked: AttendanceRow[] = (data?.clocked_in?.data ?? []).map((w) => ({
      id: w.id,
      fullName: w.full_name,
      areaName: w.area?.name,
      status: 'clocked_in',
      clockInTime: w.clock_in_time,
    }));
    const notClocked: AttendanceRow[] = (data?.not_clocked_in?.data ?? []).map((w) => ({
      id: w.id,
      fullName: w.full_name,
      areaName: w.area?.name,
      status: 'not_clocked_in',
    }));
    if (tab === 'clocked_in') { return clocked; }
    if (tab === 'not_clocked_in') { return notClocked; }
    return [...clocked, ...notClocked];
  }, [data, tab]);

  const emptyMessage = tab === 'clocked_in'
    ? 'Belum ada yang clock in pada tanggal ini.'
    : tab === 'not_clocked_in'
    ? 'Semua petugas sudah clock in pada tanggal ini.'
    : 'Belum ada data kehadiran pada tanggal ini.';

  return (
    <>
      <NBModal
        visible={visible}
        onClose={onClose}
        type="sheet"
        title="Kehadiran"
        testID="attendance-modal"
      >
        <View style={styles.body}>
          <NBDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            label="Tanggal"
            mode="date"
            maximumDate={new Date()}
          />

          {/* Selectable summary tiles — tapping switches the list below */}
          <View style={styles.tiles}>
            <SelectableStat
              tone="ok"
              value={clockedInTotal}
              label="Sudah Clock In"
              selected={tab === 'clocked_in'}
              onPress={() => toggle('clocked_in')}
              testID="attendance-tab-clocked_in"
            />
            <SelectableStat
              tone="warn"
              value={notClockedInTotal}
              label="Belum Clock In"
              selected={tab === 'not_clocked_in'}
              onPress={() => toggle('not_clocked_in')}
              testID="attendance-tab-not_clocked_in"
            />
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.list}>
              <NBSkeleton variant="card" height={64} />
              <NBSkeleton variant="card" height={64} />
            </View>
          ) : error ? (
            <NBText variant="body-sm" color="gray500" align="center" style={styles.msg}>
              Gagal memuat data kehadiran.
            </NBText>
          ) : rows.length === 0 ? (
            <NBText variant="body-sm" color="gray500" align="center" style={styles.msg}>
              {emptyMessage}
            </NBText>
          ) : (
            <View style={styles.list}>
              {rows.map((row) => (
                <AttendanceCard
                  key={`${row.status}-${row.id}`}
                  workerName={row.fullName}
                  status={row.status}
                  clockInTime={row.clockInTime}
                  areaName={row.areaName}
                  onPress={() => handleRowPress(row.id, row.fullName)}
                  testID={`attendance-row-${row.id}`}
                />
              ))}
            </View>
          )}
        </View>
      </NBModal>

      <UserAttendanceModal
        visible={selectedUser !== null}
        userId={selectedUser?.id ?? null}
        userName={selectedUser?.name}
        date={dateStr}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}

// ─── Selectable summary tile ──────────────────────────────────────────────────

function SelectableStat({
  tone,
  value,
  label,
  selected,
  onPress,
  testID,
}: {
  tone: 'ok' | 'warn';
  value: number;
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}): React.JSX.Element {
  const accent = tone === 'ok' ? nbColors.statusActive : nbColors.statusIdle;
  const bg = tone === 'ok' ? nbColors.statusActiveBg : nbColors.statusIdleBg;
  // Selected = solid accent fill; green takes white text, amber takes black (AA).
  const onKey = tone === 'ok' ? 'white' : 'black';
  return (
    <TouchableOpacity
      style={[
        styles.stat,
        selected
          ? { backgroundColor: accent, borderColor: nbColors.black }
          : { backgroundColor: bg, borderColor: accent },
        selected && styles.statSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <NBText variant="h2" color={selected ? onKey : 'black'}>{String(value)}</NBText>
      <NBText
        variant="mono-sm"
        uppercase
        color={selected ? onKey : 'gray700'}
        style={styles.statLabel}
      >
        {label}
      </NBText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: nbSpacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    paddingVertical: nbSpacing.sm,
    gap: 2,
  },
  statSelected: {
    ...nbShadows.xs,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  list: {
    gap: nbSpacing.sm,
  },
  msg: {
    paddingVertical: nbSpacing.lg,
  },
});

export default AttendanceDetailModal;
