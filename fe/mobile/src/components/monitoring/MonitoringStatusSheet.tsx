import React, { useMemo, useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { NBModal } from '../nb/NBModal';
import { NBPeekSheet } from '../nb/NBPeekSheet';
import { StatusSummaryBar } from './StatusSummaryBar';
import { WorkerTile } from './WorkerTile';
import { PersonnelGroupCard, type PersonnelGroup } from './PersonnelGroupCard';
import { AttendanceDetailModal } from './AttendanceDetailModal';
import { ROLE_LABELS } from '../../constants/roles';
import {
  nbColors,
  nbBorders,
  nbRadius,
  nbSpacing,
  nbShadows,
} from '../../constants/nbTokens';
import type { LiveUser, PresenceActivity, UserRole } from '../../types/models.types';
import type { AttendanceResponse } from '../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonitoringStatusSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  /** Active ACTIVITY filter (CP6) — the chips filter by activity; location → wrench. */
  activeActivity: PresenceActivity | null;
  onActivityChange: (activity: PresenceActivity | null) => void;
  liveUsers: LiveUser[];
  lastUpdated: string | null;
  totalAreas: number;
  staffedAreas: number;
  onUserPress?: (user: LiveUser) => void;
  /** Today's attendance summary; renders the "Kehadiran" section + detail modal. */
  attendance?: AttendanceResponse | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PEEK_HEIGHT = 88;

// Field roles first (the ones a supervisor actively handles on the map), then
// the rest. Roles not listed sort last, alphabetically by label.
const ROLE_ORDER: string[] = ['korlap', 'satgas', 'linmas', 'kepala_rayon', 'admin_data'];

function roleRank(role: string): number {
  const idx = ROLE_ORDER.indexOf(role);
  return idx === -1 ? ROLE_ORDER.length : idx;
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) { return '—'; }
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) { return 'baru saja'; }
  if (minutes < 60) { return `${minutes} mnt lalu`; }
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// ─── Component ────────────────────────────────────────────────────────────────

export const MonitoringStatusSheet = React.memo(function MonitoringStatusSheet({
  sheetRef,
  activeActivity,
  onActivityChange,
  liveUsers,
  lastUpdated,
  totalAreas,
  staffedAreas,
  onUserPress,
  attendance,
}: MonitoringStatusSheetProps): React.JSX.Element {
  const snapPoints = useMemo(() => [PEEK_HEIGHT, '50%', '90%'], []);

  const [selectedGroup, setSelectedGroup] = useState<PersonnelGroup | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const staleCount = useMemo(() => {
    const now = Date.now();
    return liveUsers.filter(u =>
      u.last_update && (now - new Date(u.last_update).getTime()) > STALE_THRESHOLD_MS,
    ).length;
  }, [liveUsers]);

  // Group the roster by role — one summary card per role the supervisor handles.
  const groups = useMemo<PersonnelGroup[]>(() => {
    const byRole = new Map<string, LiveUser[]>();
    for (const u of liveUsers) {
      const arr = byRole.get(u.role) ?? [];
      arr.push(u);
      byRole.set(u.role, arr);
    }
    return [...byRole.entries()]
      .map(([role, users]) => ({ role, users }))
      .sort((a, b) => {
        const rank = roleRank(a.role) - roleRank(b.role);
        if (rank !== 0) { return rank; }
        const la = ROLE_LABELS[a.role as UserRole] ?? a.role;
        const lb = ROLE_LABELS[b.role as UserRole] ?? b.role;
        return la.localeCompare(lb);
      });
  }, [liveUsers]);

  const handleGroupPress = useCallback((group: PersonnelGroup) => {
    setSelectedGroup(group);
  }, []);

  // Drilling into a petugas closes the group list so the detail sheet (opened by
  // the parent via onUserPress) sits cleanly over the peek, not three deep.
  const handleWorkerPress = useCallback((user: LiveUser) => {
    setSelectedGroup(null);
    onUserPress?.(user);
  }, [onUserPress]);

  const renderGroupCard = useCallback(({ item }: { item: PersonnelGroup }) => (
    <View style={styles.rowWrap}>
      <PersonnelGroupCard group={item} onPress={handleGroupPress} />
    </View>
  ), [handleGroupPress]);

  const keyExtractor = useCallback((item: PersonnelGroup) => item.role, []);

  const contentHeader = useMemo(() => (
    <>
      {/* Status row — single source for the per-status counts; tap to filter */}
      <StatusSummaryBar
        liveUsers={liveUsers}
        activeActivity={activeActivity}
        onActivityChange={onActivityChange}
      />

      {/* Kehadiran — today's clock-in summary; tap for the detail modal */}
      {attendance && (
        <View style={styles.section}>
          <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
            Kehadiran
          </NBText>
          <KehadiranCard
            clockedIn={attendance.clocked_in_count}
            notClockedIn={attendance.not_clocked_in.meta.total}
            onPress={() => setAttendanceOpen(true)}
          />
        </View>
      )}

      {/* Operasional — info card */}
      <View style={styles.section}>
        <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionTitle}>
          Operasional
        </NBText>
        <View style={styles.summaryCard}>
          <SummaryRow
            icon="account-group"
            label="Total Petugas"
            value={String(liveUsers.length)}
          />
          <SummaryRow
            icon="map-marker-check"
            label="Area Terjaga"
            value={`${staffedAreas} dari ${totalAreas} area`}
          />
          {staleCount > 0 && (
            <SummaryRow
              icon="wifi-off"
              label="GPS tidak aktif > 10 mnt"
              value={String(staleCount)}
              valueColor={nbColors.statusMissing}
            />
          )}
          <SummaryRow
            icon="clock-outline"
            label="Terakhir Diperbarui"
            value={formatLastUpdated(lastUpdated)}
            isLast
          />
        </View>
      </View>

      {/* Daftar Petugas header */}
      <View style={styles.listHeader}>
        <NBText variant="h3">Daftar Petugas</NBText>
        <NBText variant="caption" color="gray500">{liveUsers.length} petugas</NBText>
      </View>
    </>
  ), [activeActivity, onActivityChange, liveUsers, staffedAreas, totalAreas, staleCount, lastUpdated, attendance]);

  const groupLabel = selectedGroup
    ? ROLE_LABELS[selectedGroup.role as UserRole] ?? selectedGroup.role
    : '';

  return (
    <>
      <NBPeekSheet ref={sheetRef} snapPoints={snapPoints}>
        <BottomSheetFlatList
          data={groups}
          keyExtractor={keyExtractor}
          renderItem={renderGroupCard}
          ListHeaderComponent={contentHeader}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={
            <View style={styles.empty}>
              <NBText variant="body-sm" color="gray500" align="center">
                Belum ada petugas dipantau
              </NBText>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
        />
      </NBPeekSheet>

      {/* Group drill-down — list of petugas in the tapped role group */}
      <NBModal
        visible={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        type="sheet"
        title={selectedGroup ? `${groupLabel} (${selectedGroup.users.length})` : ''}
        testID="personnel-group-modal"
      >
        <View style={styles.groupList}>
          {selectedGroup?.users.map(user => (
            <WorkerTile key={user.id} user={user} onPress={handleWorkerPress} />
          ))}
        </View>
      </NBModal>

      {/* Kehadiran detail — date picker + selectable lists + per-user detail */}
      <AttendanceDetailModal
        visible={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        initialAttendance={attendance}
      />
    </>
  );
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({
  icon,
  label,
  value,
  valueColor,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.summaryRow, !isLast && styles.summaryRowBorder]}>
      <MaterialCommunityIcons name={icon} size={16} color={nbColors.gray500} />
      <NBText variant="body-sm" color="gray700" style={styles.summaryLabel}>{label}</NBText>
      <NBText
        variant="body-sm"
        style={[styles.summaryValue, valueColor ? { color: valueColor } : undefined]}
      >
        {value}
      </NBText>
    </View>
  );
}

// ─── Kehadiran summary card (peek sheet) ──────────────────────────────────────

function KehadiranCard({
  clockedIn,
  notClockedIn,
  onPress,
}: {
  clockedIn: number;
  notClockedIn: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.kehadiranCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Kehadiran: ${clockedIn} sudah masuk, ${notClockedIn} belum masuk`}
      testID="kehadiran-card"
    >
      <View style={styles.attendanceStats}>
        <AttendanceStat tone="ok" value={clockedIn} label="Sudah Clock In" />
        <AttendanceStat tone="warn" value={notClockedIn} label="Belum Clock In" />
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={nbColors.gray400} />
    </TouchableOpacity>
  );
}

function AttendanceStat({
  tone,
  value,
  label,
}: {
  tone: 'ok' | 'warn';
  value: number;
  label: string;
}): React.JSX.Element {
  const accent = tone === 'ok' ? nbColors.statusActive : nbColors.statusIdle;
  const bg = tone === 'ok' ? nbColors.statusActiveBg : nbColors.statusIdleBg;
  return (
    <View style={[styles.attendanceStat, { backgroundColor: bg, borderColor: accent }]}>
      <NBText variant="h2" color="black">{String(value)}</NBText>
      <NBText variant="mono-sm" uppercase color="gray700" style={styles.attendanceStatLabel}>
        {label}
      </NBText>
    </View>
  );
}

function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
  },
  sectionTitle: {
    marginBottom: nbSpacing.sm,
    letterSpacing: 0.4,
  },
  summaryCard: {
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    gap: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  summaryRowBorder: {
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  summaryLabel: {
    flex: 1,
  },
  summaryValue: {
    fontWeight: '600',
    color: nbColors.black,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.lg,
    paddingBottom: nbSpacing.sm,
  },
  listContent: {
    paddingBottom: nbSpacing.xl,
  },
  rowWrap: {
    paddingHorizontal: nbSpacing.md,
  },
  separator: {
    height: nbSpacing.sm,
  },
  empty: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.lg,
  },
  groupList: {
    gap: nbSpacing.sm,
  },
  kehadiranCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    ...nbShadows.sm,
  },
  attendanceStats: {
    flex: 1,
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  attendanceStat: {
    flex: 1,
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    paddingVertical: nbSpacing.sm,
    gap: 2,
  },
  attendanceStatLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
