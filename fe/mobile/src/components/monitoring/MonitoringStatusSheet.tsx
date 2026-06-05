import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { NBModal } from '../nb/NBModal';
import { NBPeekSheet } from '../nb/NBPeekSheet';
import { StatusSummaryBar } from './StatusSummaryBar';
import { WorkerTile } from './WorkerTile';
import { PersonnelGroupCard, type PersonnelGroup } from './PersonnelGroupCard';
import { ROLE_LABELS } from '../../constants/roles';
import {
  nbColors,
  nbBorders,
  nbRadius,
  nbSpacing,
} from '../../constants/nbTokens';
import type { LiveUser, TrackingStatus, UserRole } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusCounts {
  active: number;
  inactive: number;
  outside_area: number;
  missing: number;
  offline: number;
}

interface MonitoringStatusSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  statusCounts: StatusCounts;
  activeFilter: TrackingStatus | null;
  onFilterChange: (filter: TrackingStatus | null) => void;
  liveUsers: LiveUser[];
  lastUpdated: string | null;
  totalAreas: number;
  staffedAreas: number;
  onUserPress?: (user: LiveUser) => void;
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
  statusCounts,
  activeFilter,
  onFilterChange,
  liveUsers,
  lastUpdated,
  totalAreas,
  staffedAreas,
  onUserPress,
}: MonitoringStatusSheetProps): React.JSX.Element {
  const snapPoints = useMemo(() => [PEEK_HEIGHT, '50%', '90%'], []);

  const [selectedGroup, setSelectedGroup] = useState<PersonnelGroup | null>(null);

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
        statusCounts={statusCounts}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />

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
  ), [statusCounts, activeFilter, onFilterChange, liveUsers.length, staffedAreas, totalAreas, staleCount, lastUpdated]);

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
});
