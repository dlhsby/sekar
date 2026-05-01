import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { StatusSummaryBar } from './StatusSummaryBar';
import { MonitoringStatCard } from './MonitoringStatCard';
import {
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbSpacing,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusColor, getStatusLabel } from '../../utils/mapUtils';
import type { LiveUser, TrackingStatus } from '../../types/models.types';

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

const STAT_CONFIG: Array<{
  key: keyof StatusCounts;
  label: string;
  icon: string;
  color: string;
}> = [
  { key: 'active',       label: 'Petugas Aktif',       icon: 'account-check',        color: nbColors.statusActive },
  { key: 'inactive',     label: 'Tidak Aktif',         icon: 'account-clock',        color: nbColors.statusIdle },
  { key: 'outside_area', label: 'Di Luar Area',        icon: 'account-arrow-right',  color: nbColors.statusOutside },
  { key: 'missing',      label: 'Tidak Terdeteksi',    icon: 'account-alert',        color: nbColors.statusMissing },
];

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

  const staleCount = useMemo(() => {
    const now = Date.now();
    return liveUsers.filter(u =>
      u.last_update && (now - new Date(u.last_update).getTime()) > STALE_THRESHOLD_MS,
    ).length;
  }, [liveUsers]);

  const renderWorkerRow = useCallback(({ item: user }: { item: LiveUser }) => (
    <WorkerRow user={user} onPress={onUserPress} />
  ), [onUserPress]);

  const keyExtractor = useCallback((item: LiveUser) => item.id, []);

  const contentHeader = useMemo(() => (
    <>
      {/* Peek row: status chips */}
      <StatusSummaryBar
        statusCounts={statusCounts}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />

      {/* Stat grid 2×2 */}
      <View style={styles.statGrid}>
        {STAT_CONFIG.map(cfg => (
          <MonitoringStatCard
            key={cfg.key}
            label={cfg.label}
            value={statusCounts[cfg.key]}
            accent={cfg.color}
            icon={cfg.icon}
          />
        ))}
      </View>

      {/* Summary rows */}
      <View style={styles.summarySection}>
        <SummaryRow
          icon="account-group"
          label="Total Petugas"
          value={String(liveUsers.length)}
        />
        <SummaryRow
          icon="map-marker-check"
          label="Cakupan Area"
          value={`${staffedAreas}/${totalAreas} area dijaga`}
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

      {/* Worker list header */}
      <View style={styles.listHeader}>
        <NBText variant="h3">Daftar Petugas</NBText>
        <NBText variant="caption" color="gray500">{liveUsers.length} petugas</NBText>
      </View>
    </>
  ), [statusCounts, activeFilter, onFilterChange, liveUsers, staffedAreas, totalAreas, staleCount, lastUpdated]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={false}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetFlatList
        data={liveUsers}
        keyExtractor={keyExtractor}
        renderItem={renderWorkerRow}
        ListHeaderComponent={contentHeader}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </BottomSheet>
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
      <MaterialCommunityIcons name={icon} size={16} color={nbColors.gray['500']} />
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

function WorkerRow({
  user,
  onPress,
}: {
  user: LiveUser;
  onPress?: (user: LiveUser) => void;
}): React.JSX.Element {
  const statusColor = getStatusColor(user.status as TrackingStatus);
  const statusLabel = getStatusLabel(user.status as TrackingStatus);
  const isStale = user.last_update
    ? (Date.now() - new Date(user.last_update).getTime()) > STALE_THRESHOLD_MS
    : false;

  const lastSeen = user.last_update
    ? new Date(user.last_update).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <TouchableOpacity
      style={styles.workerRow}
      onPress={() => onPress?.(user)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.workerInfo}>
        <NBText variant="body-sm" style={styles.workerName}>{user.full_name}</NBText>
        <NBText variant="caption" color="gray500">
          {user.area_name ?? statusLabel}{isStale ? ' · GPS mati' : ''}
        </NBText>
      </View>
      {lastSeen && (
        <NBText variant="caption" color="gray400">{lastSeen}</NBText>
      )}
      {onPress && (
        <MaterialCommunityIcons name="chevron-right" size={16} color={nbColors.gray['400']} />
      )}
    </TouchableOpacity>
  );
}

function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    borderTopLeftRadius: nbBorderRadius.lg,
    borderTopRightRadius: nbBorderRadius.lg,
  },
  handle: {
    backgroundColor: nbColors.gray['400'],
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  summarySection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['200'],
    borderRadius: nbBorderRadius.base,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
    gap: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  summaryRowBorder: {
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray['100'],
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
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.xs,
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray['200'],
  },
  listContent: {
    paddingBottom: nbSpacing.xl,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: nbColors.white,
    ...nbShadows.xs,
  },
  workerInfo: {
    flex: 1,
    gap: 1,
  },
  workerName: {
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: nbColors.gray['100'],
    marginLeft: nbSpacing.md + 10 + nbSpacing.sm, // align with worker name
  },
});
