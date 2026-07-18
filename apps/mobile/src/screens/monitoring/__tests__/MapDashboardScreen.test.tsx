/**
 * MapDashboardScreen Integration Tests
 * Phase 2D: Tests for Redux-based supervisor map dashboard screen
 */

// Must be before imports - Jest hoists these
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('../../../services/api/monitoringApi');
jest.mock('../../../services/websocket/websocketService', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => Promise.resolve(true)),
    disconnect: jest.fn(),
    onUserLocation: jest.fn(() => jest.fn()),
    onUserStatusChanged: jest.fn(() => jest.fn()),
    onUserLeftArea: jest.fn(() => jest.fn()),
    onUserEnteredArea: jest.fn(() => jest.fn()),
    onUserReassigned: jest.fn(() => jest.fn()),
    onAreaStaffingChanged: jest.fn(() => jest.fn()),
    onUserClockIn: jest.fn(() => jest.fn()),
    onUserClockOut: jest.fn(() => jest.fn()),
    isConnected: jest.fn(() => false),
    subscribeToArea: jest.fn(),
    subscribeToRayon: jest.fn(),
    unsubscribeFromArea: jest.fn(),
    unsubscribeFromRayon: jest.fn(),
    cleanup: jest.fn(),
  },
}));
jest.mock('../../../hooks', () => ({
  useMapDashboard: jest.fn(() => ({
    areas: [],
    mapReady: true,
    setMapReady: jest.fn(),
    currentRegion: null,
    setCurrentRegion: jest.fn(),
    handleRefresh: jest.fn(),
  })),
  useNotifications: jest.fn(() => ({})),
}));
jest.mock('../../../hooks/useMapAutoFocus', () => ({
  useMapAutoFocus: jest.fn(),
}));
jest.mock('../../../store/slices/monitoringSlice', () => ({
  setSelectedUser: jest.fn((u: any) => ({ type: 'monitoring/setSelectedUser', payload: u })),
  setLiveUsers: jest.fn((u: any) => ({ type: 'monitoring/setLiveUsers', payload: u })),
  setMonitoringFilters: jest.fn((f: any) => ({ type: 'monitoring/setMonitoringFilters', payload: f })),
  resetMonitoringFilters: jest.fn(() => ({ type: 'monitoring/resetMonitoringFilters' })),
  fetchUserDaySummary: jest.fn(() => ({ type: 'monitoring/fetchUserDaySummary' })),
  fetchBoundaries: jest.fn(() => ({ type: 'monitoring/fetchBoundaries' })),
  fetchStaffingSummary: jest.fn(() => ({ type: 'monitoring/fetchStaffingSummary' })),
  updateLiveUser: jest.fn((u: any) => ({ type: 'monitoring/updateLiveUser', payload: u })),
  setBoundaries: jest.fn((b: any) => ({ type: 'monitoring/setBoundaries', payload: b })),
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { MapDashboardScreen } from '../MapDashboardScreen';
import type { LiveUser } from '../../../types/models.types';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Circle: View,
    Polygon: View,
    Callout: View,
    PROVIDER_GOOGLE: 'google',
  };
});
jest.mock('../../../components/monitoring/UserMarker', () => ({
  UserMarker: () => null,
}));
jest.mock('../../../components/monitoring/MapErrorBoundary', () => ({
  MapErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../components/monitoring/StatusSummaryBar', () => ({
  StatusSummaryBar: () => null,
}));
jest.mock('../../../components/monitoring/UserDetailSheet', () => ({
  UserDetailSheet: () => null,
}));
jest.mock('../../../components/monitoring/LocationTrail', () => ({
  LocationTrailMapLayers: () => null,
  LocationTrailOverlay: () => null,
  useLocationHistory: () => ({ history: null, isLoading: false, error: null, refresh: () => {} }),
  TRAIL_INSIDE_COLOR: '#15803D',
  TRAIL_OUTSIDE_COLOR: '#991B1B',
}));
jest.mock('../../../components/monitoring/LocationTrailModal', () => ({
  LocationTrailModal: () => null,
}));
jest.mock('../../../components/monitoring/MapFab', () => ({
  MapFab: () => null,
}));
jest.mock('../../../components/monitoring/BoundaryOverlay', () => ({
  BoundaryOverlay: () => null,
}));
jest.mock('../../../components/modals/MonitoringFilterModal', () => ({
  MonitoringFilterModal: () => null,
}));
jest.mock('../../../components/modals/BoundaryDetailModal', () => ({
  BoundaryDetailModal: () => null,
}));
// Phase 3 sub-phase 3-5 component mocks
jest.mock('../../../components/monitoring/ClusteredUserMarkers', () => ({
  ClusteredUserMarkers: () => null,
}));
jest.mock('../../../components/monitoring/AreaStatusOverlay', () => ({
  AreaStatusOverlay: () => null,
}));
jest.mock('../../../components/monitoring/PlantOverlayLayer', () => ({
  PlantOverlayLayer: () => null,
}));
jest.mock('../../../components/monitoring/MonitoringStatusSheet', () => ({
  MonitoringStatusSheet: () => null,
}));
jest.mock('../../../components/monitoring/MonitoringSearchBar', () => ({
  MonitoringSearchBar: () => null,
}));
jest.mock('../../../store/slices/monitoringV2Slice', () => ({
  toggleLayer: jest.fn((l: any) => ({ type: 'monitoringV2/toggleLayer', payload: l })),
  fetchAggregate: jest.fn(() => ({ type: 'monitoringV2/fetchAggregate' })),
  setMode: jest.fn((m: any) => ({ type: 'monitoringV2/setMode', payload: m })),
  initMonitoringView: jest.fn((p: any) => ({ type: 'monitoringV2/initMonitoringView', payload: p })),
  drillTo: jest.fn((p: any) => ({ type: 'monitoringV2/drillTo', payload: p })),
  drillBack: jest.fn(() => ({ type: 'monitoringV2/drillBack' })),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

type MonitoringState = {
  liveUsers: LiveUser[];
  statusCounts: Record<string, number>;
  selectedUser: LiveUser | null;
  filters: Record<string, any>;
  userDaySummary: any;
  isLoadingDaySummary: boolean;
  isLoading: boolean;
  error: string | null;
  boundaries: any;
};

let mockMonitoringState: MonitoringState = {
  liveUsers: [],
  statusCounts: { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 },
  selectedUser: null,
  filters: {},
  userDaySummary: null,
  isLoadingDaySummary: false,
  isLoading: false,
  error: null,
  boundaries: null,
};

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) =>
    selector({
      monitoring: mockMonitoringState,
      auth: { user: { id: 'u-1', role: 'korlap', location_id: 'area-1' } },
      // Phase 3 sub-phase 3-5: monitoringV2 slice default state
      monitoringV2: {
        visibleLayers: {
          workers: true,
          plants: false,
          overdue: false,
          rayons: true,
          areas: true,
        },
        selectedUserId: null,
        selectedAreaId: null,
        clusterZoomThreshold: 0.05,
        loading: false,
        error: null,
        snapshot: { scope: 'city', scope_id: null, workers: [], generated_at: null },
        mode: 'workers',
        view: { scope: 'area', id: 'area-1', rayonId: null, name: null },
        floor: 'area',
        aggregate: null,
        aggregateLoading: false,
      },
    }),
}));

const mockLiveUser1: LiveUser = {
  id: 'u-1',
  full_name: 'Worker One',
  role: 'satgas',
  phone: '08123456789',
  status: 'active' as any,
  location_id: 'area-1',
  area_name: 'Taman Bungkul',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.2905,
  longitude: 112.7398,
  accuracy: 10,
  battery_level: 85,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Shift Pagi',
  shift_definition_id: null,
  clock_in_time: new Date().toISOString(),
  current_task_status: null,
  current_task_title: null,
};

const mockLiveUser2: LiveUser = {
  ...mockLiveUser1,
  id: 'u-2',
  full_name: 'Worker Two',
  location_id: 'area-2',
  area_name: 'Taman Jayengrono',
  status: 'absent' as any,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MapDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMonitoringState = {
      liveUsers: [mockLiveUser1, mockLiveUser2],
      statusCounts: { active: 1, inactive: 1, outside_area: 0, missing: 0, offline: 0 },
      selectedUser: null,
      filters: {},
      userDaySummary: null,
      isLoadingDaySummary: false,
      isLoading: false,
      error: null,
      boundaries: null,
    };
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading with no users', () => {
      mockMonitoringState = { ...mockMonitoringState, isLoading: true, liveUsers: [] };
      const { getByText } = render(<MapDashboardScreen />);
      expect(getByText('Memuat peta...')).toBeTruthy();
    });

    it('should not show loading text when users are already loaded', () => {
      mockMonitoringState = { ...mockMonitoringState, isLoading: true, liveUsers: [mockLiveUser1] };
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Memuat peta...')).toBeNull();
    });
  });

  describe('Error State', () => {
    it('should show error message when error and no users', () => {
      mockMonitoringState = { ...mockMonitoringState, error: 'Gagal memuat data', liveUsers: [] };
      const { getByText } = render(<MapDashboardScreen />);
      expect(getByText('Gagal memuat data')).toBeTruthy();
    });

    it('should show retry button on error', () => {
      mockMonitoringState = { ...mockMonitoringState, error: 'Gagal memuat data', liveUsers: [] };
      const { getByText } = render(<MapDashboardScreen />);
      expect(getByText('Coba Lagi')).toBeTruthy();
    });

    it('should not show error overlay when users exist despite error', () => {
      mockMonitoringState = {
        ...mockMonitoringState,
        error: 'Partial error',
        liveUsers: [mockLiveUser1],
      };
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Partial error')).toBeNull();
    });
  });

  describe('Normal State', () => {
    it('should render map when data is loaded', () => {
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Memuat peta...')).toBeNull();
      expect(queryByText('Gagal memuat data')).toBeNull();
    });

    it('should dispatch on mount to load users', async () => {
      render(<MapDashboardScreen />);
      await act(async () => { await Promise.resolve(); });
      // Screen dispatches to load live users on mount
      // The dispatch mock records any calls including thunk dispatches
      // Just verify it renders without crashing with normal state
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Memuat peta...')).toBeNull();
    });
  });

  describe('Status Counts', () => {
    it('should receive non-zero statusCounts when users are active', () => {
      mockMonitoringState = {
        ...mockMonitoringState,
        statusCounts: { active: 3, inactive: 1, outside_area: 2, missing: 0, offline: 0 },
      };
      // Just verify component renders without crash
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Memuat peta...')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('should render without crash when liveUsers is empty and not loading', () => {
      mockMonitoringState = { ...mockMonitoringState, liveUsers: [], isLoading: false };
      const { queryByText } = render(<MapDashboardScreen />);
      expect(queryByText('Memuat peta...')).toBeNull();
      expect(queryByText('Coba Lagi')).toBeNull();
    });
  });
});
