/**
 * PerantinganListScreen Tests — staff_kecamatan "Perantingan" tab.
 *
 * CP2 design-system v2.1 sweep (June 2026): page title → NBPageHeader,
 * FAB → NBFabBar, raw <Text> → NBText, flat tokens. This suite locks the
 * screen's behavior (fetch-on-mount, card rows, filter/sort wiring,
 * FAB-create, empty state, error-toast) so the restyle stays a restyle.
 *
 * Mirrors ReviewQueueScreen.test: real store + real ListItemCard (so row
 * text is asserted), everything else mocked.
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PerantinganListScreen } from '../PerantinganListScreen';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import authReducer from '../../../store/slices/authSlice';
import * as pruningApi from '../../../services/api/pruningRequestsApi';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReact = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
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

jest.mock('../../../services/api/pruningRequestsApi');
const mockPruningApi = pruningApi as jest.Mocked<typeof pruningApi>;

jest.mock('../../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  // ListItemCard is real here — PerantinganRequestCard renders on it and the
  // screen test asserts the resulting row text (ref code / address / tree line).
  const actual = jest.requireActual('../../../components/common');
  return {
    LoadingSpinner: () => React.createElement(View, { testID: 'loading-spinner' }),
    ListItemCard: actual.ListItemCard,
  };
});

jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    NBBackgroundPattern: ({ children }: any) =>
      React.createElement(View, { testID: 'nb-background' }, children),
    NBPageHeader: ({ title }: any) =>
      React.createElement(Text, { testID: 'page-header' }, title),
    NBFabBar: ({ children }: any) =>
      React.createElement(View, { testID: 'fab-bar' }, children),
    NB_FAB_BAR_HEIGHT: 72,
    NBText: ({ children }: any) => React.createElement(Text, {}, children),
    NBEmptyState: ({ title, description, ctaLabel, onCTA }: any) =>
      React.createElement(
        View,
        { testID: 'empty-state' },
        React.createElement(Text, { testID: 'empty-state-title' }, title),
        React.createElement(Text, { testID: 'empty-state-desc' }, description),
        ctaLabel
          ? React.createElement(
              TouchableOpacity,
              { testID: 'empty-state-cta', onPress: onCTA },
              React.createElement(Text, {}, ctaLabel),
            )
          : null,
      ),
    NBToast: { show: jest.fn() },
    NBSkeleton: ({ count }: any) =>
      React.createElement(
        View,
        { testID: 'skeleton' },
        Array.from({ length: count ?? 1 }).map((_, i) =>
          React.createElement(View, { key: i, testID: `skeleton-item-${i}` }),
        ),
      ),
    NBButton: ({ title, onPress, testID }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: testID ?? `button-${title}` },
        React.createElement(Text, {}, title),
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

// ── Fixtures ───────────────────────────────────────────────────────────────
const baseRequest = {
  photoUrls: [],
  gpsLat: -7.25,
  gpsLng: 112.75,
  expectedDate: new Date('2026-06-15').toISOString(),
  notes: '',
  submittedBy: 'user1',
  requesterName: 'Budi',
};

const mockRequest1 = {
  ...baseRequest,
  id: '1',
  referenceCode: 'PR-001',
  address: 'Jl. Test 1',
  status: 'submitted' as const,
  kecamatanName: 'Kecamatan 1',
  treeCount: 5,
  createdAt: new Date('2026-06-01T03:00:00Z').toISOString(),
};

const mockRequest2 = {
  ...baseRequest,
  id: '2',
  referenceCode: 'PR-002',
  address: 'Jl. Test 2',
  status: 'approved' as const,
  kecamatanName: 'Kecamatan 2',
  treeCount: 10,
  createdAt: new Date('2026-06-02T03:00:00Z').toISOString(),
};

function createMockStore(
  overrides?: Partial<{ mine: any[]; isLoading: boolean; error: string | null }>,
) {
  return configureStore({
    reducer: {
      pruningRequests: pruningRequestsReducer,
      auth: authReducer,
    },
    preloadedState: {
      pruningRequests: {
        mine: overrides?.mine ?? [mockRequest1, mockRequest2],
        isLoading: overrides?.isLoading ?? false,
        error: overrides?.error ?? null,
      } as any,
      auth: {
        isAuthenticated: true,
        user: {
          id: 'user1',
          full_name: 'Siti Aminah',
          username: 'staff_kec_1',
          role: 'staff_kecamatan',
          rayon_id: null,
        },
      } as any,
    },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('PerantinganListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPruningApi.getMyPruningRequests.mockResolvedValue({
      data: [mockRequest1, mockRequest2] as any,
    });
  });

  it('renders the page title via NBPageHeader', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    expect(screen.getByText('Permohonan Perantingan')).toBeTruthy();
  });

  it('fetches the caller\'s requests on mount', async () => {
    render(
      <Provider store={createMockStore({ mine: [] })}>
        <PerantinganListScreen />
      </Provider>,
    );
    await waitFor(() => {
      expect(mockPruningApi.getMyPruningRequests).toHaveBeenCalled();
    });
  });

  it('renders the list of requests via PerantinganRequestCard', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    expect(screen.getByText('PR-001')).toBeTruthy();
    expect(screen.getByText('PR-002')).toBeTruthy();
    expect(screen.getByText('Jl. Test 1')).toBeTruthy();
    expect(screen.getByText(/5 pohon/)).toBeTruthy();
  });

  it('shows the default filter placeholder when no filters are active', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    expect(screen.getByText('Semua Permohonan')).toBeTruthy();
  });

  it('opens the filter modal when the filter icon is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Filter permohonan/));
    expect(screen.getByTestId('filter-modal')).toBeTruthy();
  });

  it('opens the sort modal when the sort icon is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Urutan/));
    expect(screen.getByTestId('sort-modal')).toBeTruthy();
  });

  it('applies a status filter and narrows the list to matching requests', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText(/Filter permohonan/));
    fireEvent.press(screen.getByTestId('apply-status-submitted'));
    // Only the submitted request (PR-001) survives the filter.
    expect(screen.getByText('PR-001')).toBeTruthy();
    expect(screen.queryByText('PR-002')).toBeNull();
  });

  it('selects the request and navigates to detail when a card is tapped', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PerantinganListScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByLabelText('Detail permohonan PR-001'));
    expect(mockNavigate).toHaveBeenCalledWith('PruningDetail', { requestId: '1' });
    expect(store.getState().pruningRequests.selectedRequestId).toBe('1');
  });

  it('navigates to the submit screen when the FAB is tapped', () => {
    render(
      <Provider store={createMockStore()}>
        <PerantinganListScreen />
      </Provider>,
    );
    fireEvent.press(screen.getByTestId('perantingan-submit-fab'));
    expect(mockNavigate).toHaveBeenCalledWith('PerantinganSubmit');
  });

  it('shows the create-CTA empty state when there are no requests and no filters', async () => {
    // The on-mount fetch overwrites `mine`; make it resolve empty too.
    mockPruningApi.getMyPruningRequests.mockResolvedValue({ data: [] as any });
    render(
      <Provider store={createMockStore({ mine: [], isLoading: false })}>
        <PerantinganListScreen />
      </Provider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-title')).toHaveTextContent(
        'Belum ada permohonan',
      );
    });
    fireEvent.press(screen.getByTestId('empty-state-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('PerantinganSubmit');
  });

  it('switches the empty state to a filter-aware message (no CTA) once a filter is active', async () => {
    // Start empty: the create-CTA empty state is mounted from the first render.
    mockPruningApi.getMyPruningRequests.mockResolvedValue({ data: [] as any });
    render(
      <Provider store={createMockStore({ mine: [], isLoading: false })}>
        <PerantinganListScreen />
      </Provider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-cta')).toBeTruthy();
    });
    // Applying any filter flips the empty-state copy and removes the create CTA.
    fireEvent.press(screen.getByLabelText(/Filter permohonan/));
    fireEvent.press(screen.getByTestId('apply-status-submitted'));
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-desc')).toHaveTextContent(
        'Tidak ada permohonan yang sesuai filter.',
      );
    });
    expect(screen.queryByTestId('empty-state-cta')).toBeNull();
  });

  it('renders without crashing when the slice holds an error', () => {
    render(
      <Provider store={createMockStore({ error: 'Failed to load' })}>
        <PerantinganListScreen />
      </Provider>,
    );
    // Data still renders; the error surfaces as a toast (mocked).
    expect(screen.getByText('PR-001')).toBeTruthy();
  });
});
