/**
 * StatusAndDetailSheets Component
 * Three bottom sheets: monitoring status peek, user detail, trail viewer.
 * Consolidated from MapDashboardScreen lines 809–868.
 */

import React from 'react';
import { MonitoringStatusSheet } from '../../../components/monitoring/MonitoringStatusSheet';
import { UserDetailSheet } from '../../../components/monitoring/UserDetailSheet';
import { LocationTrailModal } from '../../../components/monitoring/LocationTrailModal';
import type { LiveUser, PresenceActivity, AbsentUser } from '../../../types/models.types';
import type { NodeMarker } from '../../../components/monitoring/AggregateBubbleLayer';
import type { AttendanceResponse } from '../../../types/api.types';

interface StatusAndDetailSheetsProps {
  statusSheetVisible: boolean;
  onCloseStatusSheet: () => void;
  activityFilter: PresenceActivity | null;
  onActivityChange: (activity: PresenceActivity | null) => void;
  /** Luar jadwal — its own axis, combinable with any activity (ADR-050). */
  scheduledFilter?: 'all' | 'adhoc';
  onScheduledChange?: (next: 'all' | 'adhoc') => void;
  /** Wilayah tab: the children of the current level, plus its row actions. */
  nodes?: NodeMarker[];
  onDrillNode?: (node: NodeMarker) => void;
  onNodeDetail?: (node: NodeMarker) => void;
  isNodeHidden?: (id: string) => boolean;
  onToggleNodeHidden?: (id: string) => void;
  onShowAllHiddenNodes?: () => void;
  breadcrumbLabel?: string;
  onBreadcrumbBack?: () => void;
  liveUsers: LiveUser[];
  selectedUser: LiveUser | null;
  trailUser: LiveUser | null;
  userDaySummary: any;
  isLoadingDaySummary: boolean;
  onCloseSheet: () => void;
  onTrailPress: (user: LiveUser) => void;
  onCloseTrail: () => void;
  onUserPress: (user: LiveUser) => void;
  attendance: AttendanceResponse | null;
  lastUpdated: string | null;
  totalAreas: number;
  staffedAreas: number;
  onLeaveUsers?: AbsentUser[];
  /** belum_hadir / tidak_hadir split for the current scope (ADR-050). */
  rosterSplit?: { belum_hadir: number; tidak_hadir: number } | null;
}

export function StatusAndDetailSheets({
  statusSheetVisible,
  onCloseStatusSheet,
  activityFilter,
  onActivityChange,
  scheduledFilter,
  onScheduledChange,
  nodes,
  onDrillNode,
  onNodeDetail,
  isNodeHidden,
  onToggleNodeHidden,
  onShowAllHiddenNodes,
  breadcrumbLabel,
  onBreadcrumbBack,
  liveUsers,
  selectedUser,
  trailUser,
  userDaySummary,
  isLoadingDaySummary,
  onCloseSheet,
  onTrailPress,
  onCloseTrail,
  onUserPress,
  attendance,
  lastUpdated,
  totalAreas,
  staffedAreas,
  onLeaveUsers,
  rosterSplit,
}: StatusAndDetailSheetsProps): React.JSX.Element {
  return (
    <>
      {/* Monitoring status peek sheet */}
      <MonitoringStatusSheet
        visible={statusSheetVisible}
        onClose={onCloseStatusSheet}
        activeActivity={activityFilter}
        onActivityChange={onActivityChange}
        scheduledFilter={scheduledFilter}
        onScheduledChange={onScheduledChange}
        nodes={nodes}
        onDrillNode={onDrillNode}
        onNodeDetail={onNodeDetail}
        isNodeHidden={isNodeHidden}
        onToggleNodeHidden={onToggleNodeHidden}
        onShowAllHiddenNodes={onShowAllHiddenNodes}
        breadcrumbLabel={breadcrumbLabel}
        onBreadcrumbBack={onBreadcrumbBack}
        liveUsers={liveUsers}
        lastUpdated={lastUpdated}
        totalAreas={totalAreas}
        staffedAreas={staffedAreas}
        onUserPress={onUserPress}
        attendance={attendance}
        rosterSplit={rosterSplit}
        onLeaveUsers={onLeaveUsers}
      />

      {/* User detail bottom sheet */}
      <UserDetailSheet
        user={selectedUser}
        daySummary={userDaySummary}
        isLoadingDaySummary={isLoadingDaySummary}
        onClose={onCloseSheet}
        onTrailPress={onTrailPress}
      />

      {/* Trail viewer — separate fullscreen modal with its own MapView */}
      <LocationTrailModal
        visible={trailUser !== null}
        user={trailUser}
        onClose={onCloseTrail}
      />
    </>
  );
}
