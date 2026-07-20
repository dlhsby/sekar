/**
 * FilterAndSearchModals Component
 * Monitoring filter modal, search modal, and boundary detail modal.
 * Consolidated from MapDashboardScreen lines 831–868.
 */

import React from 'react';
import { MonitoringFilterModal } from '../../../components/modals/MonitoringFilterModal';
import { MonitoringSearchModal } from '../../../components/monitoring/MonitoringSearchModal';
import { BoundaryDetailModal } from '../../../components/modals/BoundaryDetailModal';
import type { LiveUser, RayonBoundary, AreaBoundary, User } from '../../../types/models.types';
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
  rayons: RayonBoundary[] | undefined;
  onSearchSelect: (result: SearchResult) => void;
  boundaryDetailVisible: boolean;
  setBoundaryDetailVisible: (visible: boolean) => void;
  boundaryDetailType: 'rayon' | 'location';
  boundaryDetailData: RayonBoundary | AreaBoundary | null;
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
  rayons,
  onSearchSelect,
  boundaryDetailVisible,
  setBoundaryDetailVisible,
  boundaryDetailType,
  boundaryDetailData,
}: FilterAndSearchModalsProps): React.JSX.Element {
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

      {/* Boundary detail modal */}
      <BoundaryDetailModal
        type={boundaryDetailType}
        data={boundaryDetailData}
        visible={boundaryDetailVisible}
        onClose={() => setBoundaryDetailVisible(false)}
      />

      {/* Fullscreen search — find a petugas / location / rayon and fly to it */}
      <MonitoringSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        liveUsers={liveUsers}
        rayons={rayons}
        onSelect={onSearchSelect}
      />
    </>
  );
}
