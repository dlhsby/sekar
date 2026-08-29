/**
 * FilterAndSearchModals Component
 * Monitoring filter modal, search modal, and boundary detail modal.
 * Consolidated from MapDashboardScreen lines 831–868.
 */

import React, { useState } from 'react';
import { MonitoringFilterModal } from '../../../components/modals/MonitoringFilterModal';
import { MonitoringSearchModal } from '../../../components/monitoring/MonitoringSearchModal';
import { BoundaryDetailModal } from '../../../components/modals/BoundaryDetailModal';
import { ReassignWorkerModal } from '../../../components/modals/ReassignWorkerModal';
import type { LiveUser, DistrictBoundary, AreaBoundary, User } from '../../../types/models.types';
import type { MonitoringFilters } from '../../../types/api.types';
import type { SearchResult } from '../../../hooks/useMonitoringSearch';

interface FilterAndSearchModalsProps {
  currentUser: User | null;
  filterModalVisible: boolean;
  setFilterModalVisible: (visible: boolean) => void;
  filters: MonitoringFilters;
  users: LiveUser[];
  onApplyFilters: (filters: MonitoringFilters) => void;
  searchModalVisible: boolean;
  setSearchModalVisible: (visible: boolean) => void;
  liveUsers: LiveUser[];
  onSearchSelect: (result: SearchResult) => void;
  boundaryDetailVisible: boolean;
  setBoundaryDetailVisible: (visible: boolean) => void;
  boundaryDetailType: 'district' | 'location';
  boundaryDetailData: DistrictBoundary | AreaBoundary | null;
}

export function FilterAndSearchModals({
  currentUser,
  filterModalVisible,
  setFilterModalVisible,
  filters,
  users,
  onApplyFilters,
  searchModalVisible,
  setSearchModalVisible,
  liveUsers,
  onSearchSelect,
  boundaryDetailVisible,
  setBoundaryDetailVisible,
  boundaryDetailType,
  boundaryDetailData,
}: FilterAndSearchModalsProps): React.JSX.Element {
  // The lokasi being staffed. Local state, not a prop: it exists only between
  // the boundary sheet closing and the reassign sheet closing, and no parent
  // needs to know about that window.
  const [reassignArea, setReassignArea] = useState<AreaBoundary | null>(null);

  return (
    <>
      {/* Filter modal */}
      {currentUser && (
        <MonitoringFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={onApplyFilters}
          currentFilters={filters}
          currentUser={currentUser}
          users={users}
        />
      )}

      {/* Boundary detail modal.
          `onReassign` restores the entry point for the button this modal has
          always rendered: it was gated on `is_understaffed && onReassign`, and
          nothing ever passed `onReassign` — so it never once appeared. The
          trigger was stripped by the 2026-06-10 map rebuild (49026d85) and, unlike
          filters and boundaries, never layered back on. */}
      <BoundaryDetailModal
        type={boundaryDetailType}
        data={boundaryDetailData}
        visible={boundaryDetailVisible}
        onClose={() => setBoundaryDetailVisible(false)}
        onReassign={(area) => {
          setBoundaryDetailVisible(false);
          setReassignArea(area);
        }}
      />

      <ReassignWorkerModal
        visible={reassignArea != null}
        onClose={() => setReassignArea(null)}
        targetArea={reassignArea}
        onSuccess={() => setReassignArea(null)}
      />

      {/* Fullscreen search — find a petugas / location / district and fly to it */}
      <MonitoringSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        liveUsers={liveUsers}
        onSelect={onSearchSelect}
      />
    </>
  );
}
