/**
 * StatusAndDetailSheets Component
 * Three bottom sheets: monitoring status peek, user detail, trail viewer.
 * Consolidated from MapDashboardScreen lines 809–868.
 */

import React from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { MonitoringStatusSheet } from '../../../components/monitoring/MonitoringStatusSheet';
import { UserDetailSheet } from '../../../components/monitoring/UserDetailSheet';
import { LocationTrailModal } from '../../../components/monitoring/LocationTrailModal';
import type { LiveUser, PresenceActivity } from '../../../types/models.types';
import type { AttendanceResponse } from '../../../types/api.types';

interface StatusAndDetailSheetsProps {
  statusSheetRef: React.RefObject<BottomSheet | null>;
  activityFilter: PresenceActivity | null;
  onActivityChange: (activity: PresenceActivity | null) => void;
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
}

export function StatusAndDetailSheets({
  statusSheetRef,
  activityFilter,
  onActivityChange,
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
}: StatusAndDetailSheetsProps): React.JSX.Element {
  return (
    <>
      {/* Monitoring status peek sheet */}
      <MonitoringStatusSheet
        sheetRef={statusSheetRef}
        activeActivity={activityFilter}
        onActivityChange={onActivityChange}
        liveUsers={liveUsers}
        lastUpdated={lastUpdated}
        totalAreas={totalAreas}
        staffedAreas={staffedAreas}
        onUserPress={onUserPress}
        attendance={attendance}
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
