/**
 * ReviewQueueScreen Tests — admin pruning request review queue
 *
 * Phase 3 sub-phase 3-10. Redesigned May 2026 to match the canonical list
 * pattern (PerantinganListScreen / OvertimeListScreen / TasksTab):
 * filter modal + sort modal + PerantinganRequestCard rows. Approve / reject
 * happens on the detail screen, so this screen is purely list-presentation.
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReviewQueueScreen } from '../ReviewQueueScreen';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import authReducer from '../../../store/slices/authSlice';
import * as pruningApi from '../../../services/api/pruningRequestsApi';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReact = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (callback: any) => {
      actualReact.useEffect(() => { callback(); }, []);
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: any) =>
      React.createElement(View, { style }, children),
  };
});

jest.mock('../../../hooks/useUserRole', () => ({
  useUserRole: () => 'admin_data',
}));

jest.mock('../../../services/api/pruningRequestsApi');
const mockPruningApi = pruningApi as jest.Mocked<typeof pruningApi>;

jest.mock('../../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LoadingSpinner: () => React.createElement(View, { testID: 'loading-spinner' }),
  };
});

jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    NBBackgroundPattern: ({ children }: any) =>
      React.createElement(View, { testID: 'nb-background' }, children),
    NBEmptyState: ({ title, description }: any) =>
      React.createElement(
        View,
        { testID: 'empty-state' },
        React.createElement(Text, { testID: 'empty-state-title' }, title),
        React.createElement(Text, { testID: 'empty-state-desc' }, description),
      ),
    NBAlert: ({ title, message, type }: any) =>
      React.createElement(
        View,
        { testID: `alert-${type}` },
        React.createElement(Text, { testID: 'alert-title' }, title),
        React.createElement(Text, { testID: 'alert-message' }, message),
      ),
    NBToast: { show: jest.fn() },
    NBCard: ({ children, style }: any) =>
      React.createElement(View, { style, testID: 'nb-card' }, children),
    NBBadge: ({ text, label }: any) =>
      React.createElement(Text, { testID: 'nb-badge' }, text ?? label),
    NBButton: ({ title, label, onPress, disabled, testID }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled, testID: testID ?? `button-${title ?? label}` },
        React.createElement(Text, {}, title ?? label),
      ),
  };
});

jest.mock('../../../components/modals', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SortModal: ({ visible, onClose, options, onSelect }: any) =>
      visible
        ? React.createElement(
            View,
            { testID: 'sort-modal' },
            options.map((o: any) =>
              React.createElement(
                TouchableOpacity,
                {
                  key: o.key,
                  testID: `sort-option-${o.key}`,
                  onPress: () => { onSelect(o.key); onClose(); },
                },
                React.createElement(Text, {}, o.label),
              ),
            ),
          )
        : null,
    PruningRequestFilterModal: ({ visible, onClose, onApplyFilters }: any) =>
      visible
        ? React.createElement(
            View,
            { testID: 'filter-modal' },
            React.createElement(
              TouchableOpacity,
              {
                testID: 'apply-status-submitted',
                onPress: () => { onApplyFilters({ status: 'submitted' }); onClose(); },
              },
              React.createElement(Text, {}, 'Apply Submitted'),
            ),
          )
        : null,
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('../../../utils/dateUtils', () => ({
  formatDate: (date: string) => new Date(date).toLocaleDateString('id-ID'),
  formatDateTime: (date: string) => new Date(date).toLocaleString('id-ID'),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────
const baseRequest = {
  createdAt: new Date('2026-05-01T03:00:00Z').toISOString(),
  photoUrls: [],
  gpsLat: -7.25,
  gpsLng: 112.75,
  expectedDate: new Date('2026-05-15').toISOString(),
  notes: '',
};

const mockRequest1 = {
  ...baseRequest,
  id: '1',
  referenceCode: 'PR-001',
  address: 'Jl. Test 1',
  status: 'submitted' as const,
  kecamatanName: 'Kecamatan 1',
  estimatedPlantCount: 5,
};

const mockRequest2 = {
  ...baseRequest,
  id: '2',
  referenceCode: 'PR-002',
  address: 'Jl. Test 2',
  status: 'under_review' as const,
  kecamatanName: 'Kecamatan 2',
  estimatedPlantCount: 10,
};

const mockRequest3 = {
  ...baseRequest,
  id: '3',
  referenceCode: 'PR-003',
  address: 'Jl. Test 3',
  status: 'approved' as const,
  kecamatanName: 'Kecamatan 1',
  estimatedPlantCount: 3,
};

function createMockStore(
  overrides?: Partial<{
    adminList: any[];
    adminListLoading: boolean;
    adminListError: { error: string } | null;
  }>,
) {
  return configureStore({
    reducer: {
      pruningRequests: pruningRequestsReducer,
      auth: authReducer,
    },
    preloadedState: {
      pruningRequests: {
        adminList: overrides?.adminList ?? [mockRequest1, mockRequest2, mockRequest3],
        adminListLoading: overrides?.adminListLoading ?? false,
        adminListError: overrides?.adminListError ?? null,
        reviewingId: null,
        details: {},
        myList: [],
        myListLoading: false,
        myListError: null,
        submitting: false,
        selectedId: null,
      },
      auth: {
        isAuthenticated: true,
        user: {
          id: 'user1',
          name: 'Admin',
          full_name: 'Admin Pusat',
          username: 'admin_data_pusat_1',
          role: 'admin_data',
          rayon_id: 'rayon-pusat',
        },
      },
    },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('ReviewQueueScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPruningApi.getAdminPruningRequests.mockResolvedValue({
      data: [mockRequest1, mockRequest2, mockRequest3] as any,
    });
  });

  it('renders the page title', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    expect(screen.getByText('Review Permohonan Perantingan')).toBeTruthy();
  });

  it('renders the list of requests via PerantinganRequestCard', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    expect(screen.getByText('PR-001')).toBeTruthy();
    expect(screen.getByText('PR-002')).toBeTruthy();
    expect(screen.getByText('PR-003')).toBeTruthy();
    expect(screen.getByText('Jl. Test 1')).toBeTruthy();
    expect(screen.getByText(/5 pohon/)).toBeTruthy();
  });

  it('shows the default filter placeholder when no filters are active', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    expect(screen.getByText('Semua Permohonan')).toBeTruthy();
  });

  it('opens the filter modal when filter icon is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Filter permohonan/));
    expect(screen.getByTestId('filter-modal')).toBeTruthy();
  });

  it('opens the sort modal when sort icon is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Urutan/));
    expect(screen.getByTestId('sort-modal')).toBeTruthy();
  });

  it('applies a status filter and renders an active mini-chip', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Filter permohonan/));
    fireEvent.press(screen.getByTestId('apply-status-submitted'));
    // "Menunggu" now appears in BOTH the card status badge and the filter mini-chip.
    expect(screen.getAllByText('Menunggu').length).toBeGreaterThanOrEqual(2);
    // Filtered list shows only submitted request.
    expect(screen.queryByText('PR-002')).toBeNull();
    expect(screen.queryByText('PR-003')).toBeNull();
  });

  it('navigates to detail with adminMode when a card is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <ReviewQueueScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText('Detail permohonan PR-001'));
    expect(mockNavigate).toHaveBeenCalledWith('PruningDetail', {
      requestId: '1',
      adminMode: true,
    });
  });

  it('shows the loading spinner on initial load', () => {
    render(
      <Provider
        store={createMockStore({ adminList: [], adminListLoading: true })}
      >
        <ReviewQueueScreen />
      </Provider>,
    );
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('shows an empty state when there are no requests', async () => {
    // Initial render kicks off `fetchAdminPruningRequests` which flips
    // `adminListLoading` to `true` via the pending case; we wait for the
    // fulfilled action (mocked to return []) before asserting the empty UI.
    mockPruningApi.getAdminPruningRequests.mockResolvedValue({ data: [] as any });
    render(
      <Provider
        store={createMockStore({ adminList: [], adminListLoading: false })}
      >
        <ReviewQueueScreen />
      </Provider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-title')).toHaveTextContent(
        'Tidak ada permohonan',
      );
    });
  });

  it('renders without crashing when there is an error in state', () => {
    render(
      <Provider
        store={createMockStore({ adminListError: { error: 'Failed to load' } })}
      >
        <ReviewQueueScreen />
      </Provider>,
    );
    // Data still renders; the error surfaces as a toast (mocked).
    expect(screen.getByText('PR-001')).toBeTruthy();
  });
});
